import { LANGUAGE_CODES, type LanguageCode } from '../../../lib/i18n/languages';
import type { AccountStatus } from '../../../lib/types/auth';
import type { JobStatus } from '../../../lib/types/jobs';
import { AUDIT_ACTIONS, type PlatformSettings, type TrendPoint } from '../../../lib/types/superadmin';
import { newId, nowIso, type DbJob, type DbUser, type MockDb } from '../db';
import { audit, notify } from '../events';
import {
  byNewest,
  caller,
  fail,
  isPlainObject,
  ok,
  paginate,
  readEnum,
  readNumber,
  readString,
  route,
  type MockRequest,
  type Route,
} from '../http';
import {
  displayName,
  toAdminUserDetail,
  toAdminUserListItem,
  toAuditLog,
  toJobDetail,
  toJobSummary,
  toModerationItem,
  toReport,
} from '../serializers';
import { setVerification } from './profile';

const OWNER: readonly ['superadmin'] = ['superadmin'];
const ACCOUNT_STATUSES: readonly AccountStatus[] = ['active', 'suspended', 'banned'];
const JOB_STATUSES: readonly JobStatus[] = ['draft', 'analysing', 'pending_review', 'active', 'closed', 'rejected', 'taken_down'];
const TREND_DAYS = 14;
const DOCUMENT_URL_TTL_MS = 60_000;

function reasonFrom(body: Record<string, unknown>, key = 'reason'): string {
  return readString(body, key, { min: 5, max: 300 });
}

function managedUser(request: MockRequest): DbUser {
  const user = request.db.users.find((candidate) => candidate.id === request.params.id);
  if (!user || user.role === 'superadmin') throw fail.notFound();
  return user;
}

function dailyCounts(timestamps: readonly string[], now: number): TrendPoint[] {
  return Array.from({ length: TREND_DAYS }, (_, index) => {
    const day = new Date(now - (TREND_DAYS - 1 - index) * 86_400_000).toISOString().slice(0, 10);
    return { date: day, count: timestamps.filter((at) => at.startsWith(day)).length };
  });
}

function revokeSessions(db: MockDb, userId: string): void {
  for (const session of Object.values(db.auth.refreshTokens)) {
    if (session.userId === userId) session.revoked = true;
  }
  for (const [token, access] of Object.entries(db.auth.accessTokens)) {
    if (access.userId === userId) delete db.auth.accessTokens[token];
  }
}

/** Activates a job once nothing blocks it (sector resolved, no open moderation items). */
function activateIfClear(db: MockDb, job: DbJob): void {
  const blocked = db.moderation.some((item) => item.jobId === job.id && item.status === 'open');
  if (!blocked && job.sectorId) {
    job.status = 'active';
    job.updatedAt = nowIso();
  }
}

function closeModerationFor(db: MockDb, jobId: string, status: 'approved' | 'rejected', note: string): void {
  db.moderation
    .filter((item) => item.jobId === jobId && item.status === 'open')
    .forEach((item) => {
      item.status = status;
      item.note = note;
    });
}

function readSettingsPatch(body: Record<string, unknown>, current: PlatformSettings): PlatformSettings {
  const next: PlatformSettings = {
    ai: { ...current.ai },
    otp: { ...current.otp },
    enabledLanguages: [...current.enabledLanguages],
  };
  if (isPlainObject(body.ai)) {
    for (const key of ['sectorMatchThreshold', 'sectorReviewThreshold', 'photoSafetyThreshold', 'authenticityThreshold'] as const) {
      if (key in body.ai) next.ai[key] = readNumber(body.ai, key, 0, 1);
    }
    if (next.ai.sectorReviewThreshold > next.ai.sectorMatchThreshold) throw fail.validation({ sectorReviewThreshold: 'order' });
  }
  if (isPlainObject(body.otp)) {
    if ('maxRequestsPerHour' in body.otp) next.otp.maxRequestsPerHour = readNumber(body.otp, 'maxRequestsPerHour', 1, 20);
    if ('resendAfterSec' in body.otp) next.otp.resendAfterSec = readNumber(body.otp, 'resendAfterSec', 15, 300);
    if ('expirySec' in body.otp) next.otp.expirySec = readNumber(body.otp, 'expirySec', 60, 900);
  }
  if ('enabledLanguages' in body) {
    const languages = body.enabledLanguages;
    if (
      !Array.isArray(languages) ||
      languages.length === 0 ||
      !languages.every((code) => typeof code === 'string' && (LANGUAGE_CODES as readonly string[]).includes(code))
    ) {
      throw fail.validation({ enabledLanguages: 'invalid' });
    }
    // English is the fallback for every other language, so it can never be disabled.
    next.enabledLanguages = Array.from(new Set(['en', ...languages])) as LanguageCode[];
  }
  return next;
}

export const superadminRoutes: Route[] = [
  route('GET', '/superadmin/overview', OWNER, ({ db }) => {
    const now = Date.now();
    const today = nowIso().slice(0, 10);
    const month = today.slice(0, 7);
    const seekers = db.users.filter((user) => user.role === 'user');
    const hirers = db.users.filter((user) => user.role === 'admin');
    return ok({
      kpis: {
        jobSeekers: seekers.length,
        hirers: hirers.length,
        activeJobs: db.jobs.filter((job) => job.status === 'active').length,
        applicationsToday: db.applications.filter((app) => app.createdAt.startsWith(today)).length,
        pendingVerifications: [...seekers, ...hirers].filter(
          (user) => (user.seeker?.aadhaar.status ?? user.hirer?.aadhaar.status) === 'pending',
        ).length,
        openReports: db.reports.filter((report) => report.status === 'open').length,
        moderationQueue: db.moderation.filter((item) => item.status === 'open').length,
        hiresThisMonth: db.applications.filter((app) => app.timeline.some((event) => event.status === 'hired' && event.at.startsWith(month))).length,
      },
      trends: {
        applications: dailyCounts(db.applications.map((app) => app.createdAt), now),
        signups: dailyCounts([...seekers, ...hirers].map((user) => user.createdAt), now),
      },
    });
  }),

  route('GET', '/superadmin/users', OWNER, ({ db, query }) => {
    const role = query.role === 'admin' ? 'admin' : 'user';
    const status = ACCOUNT_STATUSES.find((candidate) => candidate === query.status);
    const q = query.q?.trim().toLowerCase() ?? '';
    const users = db.users
      .filter((user) => user.role === role && (!status || user.status === status))
      .map(toAdminUserListItem)
      .filter((user) => !q || [user.name, user.phone, user.city].some((value) => value?.toLowerCase().includes(q)))
      .sort(byNewest);
    return ok(paginate(users, query));
  }),

  route('GET', '/superadmin/users/:id', OWNER, (request) => ok(toAdminUserDetail(managedUser(request), request.db))),

  route('PATCH', '/superadmin/users/:id/status', OWNER, (request) => {
    const owner = caller(request);
    const user = managedUser(request);
    const status = readEnum(request.body, 'status', ACCOUNT_STATUSES);
    const reason = reasonFrom(request.body);
    if (status === user.status) throw fail.conflict('NO_CHANGE');
    user.status = status;
    user.statusReason = status === 'active' ? null : reason;
    if (status !== 'active') revokeSessions(request.db, user.id);
    const action = status === 'active' ? 'user.reactivate' : status === 'suspended' ? 'user.suspend' : 'user.ban';
    audit(request.db, owner.id, action, { type: 'user', id: user.id, label: displayName(user) }, reason);
    return ok(toAdminUserDetail(user, request.db));
  }),

  route('PATCH', '/superadmin/users/:id/verification', OWNER, (request) => {
    const owner = caller(request);
    const user = managedUser(request);
    const decision = readEnum(request.body, 'decision', ['verified', 'rejected'] as const);
    const reason = decision === 'rejected' ? reasonFrom(request.body) : null;
    if ((user.seeker ?? user.hirer)?.aadhaar.status === 'none') throw fail.conflict('NO_DOCUMENT');
    setVerification(request.db, user, decision, reason);
    const action = decision === 'verified' ? 'verification.approve' : 'verification.reject';
    audit(request.db, owner.id, action, { type: 'user', id: user.id, label: displayName(user) }, reason);
    return ok(toAdminUserDetail(user, request.db));
  }),

  route('GET', '/superadmin/documents/:id/url', OWNER, ({ db, params }) => {
    const document = db.documents.find((candidate) => candidate.id === params.id);
    if (!document) throw fail.notFound();
    // A real server returns a signed URL that expires; the mock simply reports the expiry.
    return ok({ url: document.uri, expiresAt: new Date(Date.now() + DOCUMENT_URL_TTL_MS).toISOString() });
  }),

  route('GET', '/superadmin/jobs', OWNER, ({ db, query }) => {
    const status = JOB_STATUSES.find((candidate) => candidate === query.status);
    const q = query.q?.trim().toLowerCase() ?? '';
    const jobs = db.jobs
      .filter((job) => (!status || job.status === status) && (!q || job.title.toLowerCase().includes(q)))
      .sort(byNewest);
    const page = paginate(jobs, query);
    return ok({ ...page, items: page.items.map((job) => toJobSummary(job, db, null)) });
  }),

  route('PATCH', '/superadmin/jobs/:id', OWNER, (request) => {
    const owner = caller(request);
    const { db, body } = request;
    const job = db.jobs.find((candidate) => candidate.id === request.params.id);
    if (!job) throw fail.notFound();
    const action = readEnum(body, 'action', ['approve', 'reject', 'take_down'] as const);
    const reason = action === 'approve' ? readString(body, 'reason', { optional: true, max: 300 }) || null : reasonFrom(body);

    if (action === 'approve') {
      if (job.status !== 'pending_review') throw fail.conflict('INVALID_STATE');
      if (!job.sectorId && job.proposedSectorName) {
        // Approving the job directly also accepts the proposed sector.
        const sectorId = newId('sec');
        db.sectors.push({ id: sectorId, slug: job.proposedSectorName.toLowerCase().replace(/\s+/g, '-'), name: job.proposedSectorName, createdAt: nowIso() });
        job.sectorId = sectorId;
        job.proposedSectorName = null;
        job.sectorDecision = 'match';
      }
      closeModerationFor(db, job.id, 'approved', reason ?? '');
      activateIfClear(db, job);
    } else {
      if (action === 'take_down' && job.status !== 'active') throw fail.conflict('INVALID_STATE');
      job.status = action === 'reject' ? 'rejected' : 'taken_down';
      job.updatedAt = nowIso();
      closeModerationFor(db, job.id, 'rejected', reason ?? '');
    }
    const auditAction = action === 'approve' ? 'job.approve' : action === 'reject' ? 'job.reject' : 'job.take_down';
    audit(db, owner.id, auditAction, { type: 'job', id: job.id, label: job.title }, reason);
    notify(db, job.hirerId, 'job_review', { jobTitle: job.title, status: job.status }, { kind: 'job', id: job.id });
    return ok(toJobDetail(job, db, null));
  }),

  route('GET', '/superadmin/moderation', OWNER, ({ db, query }) => {
    const wantOpen = query.status !== 'closed';
    const items = db.moderation.filter((item) => (item.status === 'open') === wantOpen).sort(byNewest);
    const page = paginate(items, query);
    return ok({ ...page, items: page.items.map((item) => toModerationItem(item, db)) });
  }),

  route('POST', '/superadmin/moderation/:id/decision', OWNER, (request) => {
    const owner = caller(request);
    const { db, body } = request;
    const item = db.moderation.find((candidate) => candidate.id === request.params.id);
    if (!item) throw fail.notFound();
    if (item.status !== 'open') throw fail.conflict('ALREADY_DECIDED');
    const decision = readEnum(body, 'decision', ['approve', 'reject'] as const);
    const note = reasonFrom(body, 'note');
    const job = db.jobs.find((candidate) => candidate.id === item.jobId);
    if (!job) throw fail.notFound();

    // Work out the sector choice (and validate it) before changing anything.
    let sectorChoice: { existingId: string } | { newName: string } | null = null;
    if (decision === 'approve' && item.kind === 'sector_suggestion') {
      const sectorId = typeof body.sectorId === 'string' && body.sectorId ? body.sectorId : null;
      if (sectorId) {
        if (!db.sectors.some((sector) => sector.id === sectorId)) throw fail.validation({ sectorId: 'unknown' });
        sectorChoice = { existingId: sectorId };
      } else {
        const name = readString(body, 'sectorName', { optional: true, min: 2, max: 40 }) || item.sectorSuggestion?.proposedName || job.proposedSectorName;
        if (!name) throw fail.validation({ sectorName: 'required' });
        sectorChoice = { newName: name };
      }
    }

    item.status = decision === 'approve' ? 'approved' : 'rejected';
    item.note = note;
    if (decision === 'reject') {
      job.status = 'rejected';
      job.updatedAt = nowIso();
    } else {
      if (sectorChoice) {
        if ('existingId' in sectorChoice) {
          job.sectorId = sectorChoice.existingId;
        } else {
          const newSectorId = newId('sec');
          const name = sectorChoice.newName;
          db.sectors.push({ id: newSectorId, slug: name.toLowerCase().replace(/\s+/g, '-'), name, createdAt: nowIso() });
          job.sectorId = newSectorId;
        }
        job.proposedSectorName = null;
        job.sectorDecision = 'match';
      }
      activateIfClear(db, job);
    }
    const action = decision === 'approve' ? 'moderation.approve' : 'moderation.reject';
    audit(db, owner.id, action, { type: 'moderation', id: item.id, label: job.title }, note);
    notify(db, job.hirerId, 'job_review', { jobTitle: job.title, status: job.status }, { kind: 'job', id: job.id });
    return ok(toModerationItem(item, db));
  }),

  route('GET', '/superadmin/reports', OWNER, ({ db, query }) => {
    const status = (['open', 'resolved', 'dismissed'] as const).find((candidate) => candidate === query.status);
    const reports = db.reports.filter((report) => !status || report.status === status).sort(byNewest);
    const page = paginate(reports, query);
    return ok({ ...page, items: page.items.map((report) => toReport(report, db)) });
  }),

  route('PATCH', '/superadmin/reports/:id', OWNER, (request) => {
    const owner = caller(request);
    const { db, body } = request;
    const report = db.reports.find((candidate) => candidate.id === request.params.id);
    if (!report) throw fail.notFound();
    if (report.status !== 'open') throw fail.conflict('ALREADY_DECIDED');
    // Validate everything before changing anything, so a bad request leaves no partial update.
    const status = readEnum(body, 'status', ['resolved', 'dismissed'] as const);
    const note = reasonFrom(body, 'note');
    report.status = status;
    report.resolutionNote = note;
    const action = report.status === 'resolved' ? 'report.resolve' : 'report.dismiss';
    audit(db, owner.id, action, { type: 'report', id: report.id, label: report.targetLabel }, report.resolutionNote);
    return ok(toReport(report, db));
  }),

  route('GET', '/superadmin/audit-logs', OWNER, ({ db, query }) => {
    const action = AUDIT_ACTIONS.find((candidate) => candidate === query.action);
    const q = query.q?.trim().toLowerCase() ?? '';
    const logs = db.auditLogs
      .filter((log) => !action || log.action === action)
      .filter((log) => !q || log.target.label.toLowerCase().includes(q) || (log.reason ?? '').toLowerCase().includes(q))
      .sort(byNewest);
    const page = paginate(logs, query);
    return ok({ ...page, items: page.items.map((log) => toAuditLog(log, db)) });
  }),

  route('GET', '/superadmin/settings', OWNER, ({ db }) => ok(db.settings)),

  route('PATCH', '/superadmin/settings', OWNER, (request) => {
    const owner = caller(request);
    const { db } = request;
    db.settings = readSettingsPatch(request.body, db.settings);
    audit(db, owner.id, 'settings.update', { type: 'settings', id: 'platform', label: 'Platform settings' });
    return ok(db.settings);
  }),
];
