import { LANGUAGE_CODES, type LanguageCode } from '../../../lib/i18n/languages';
import { SALARY_TYPES, SHIFTS, type JobAnalysisComplete, type JobLocation } from '../../../lib/types/jobs';
import type { PlatformSettings } from '../../../lib/types/superadmin';
import { analyseWorkplacePhotos, checkSectorName } from '../ai';
import { newId, nowIso, type DbJob, type DbUser, type MockDb } from '../db';
import { notify } from '../events';
import {
  accepted,
  byNewest,
  caller,
  created,
  fail,
  isPlainObject,
  ok,
  paginate,
  readEnum,
  readNumber,
  readString,
  readStringArray,
  route,
  type MockRequest,
  type Route,
} from '../http';
import { toApplicantSummary, toJobDetail, toJobSummary } from '../serializers';
import { assertUploadAllowed, storeUpload } from '../uploads';
import { sortedSectors } from './jobs';
import { applyAutoVerification } from './profile';

/** How long the simulated photo analysis takes before a result is available. */
const ANALYSIS_DURATION_MS = 3_000;
const PINCODE = /^[1-9]\d{5}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Applies the superadmin's confidence thresholds to a raw sector decision. */
function sectorDecisionWithThresholds(db: MockDb, name: string) {
  const raw = checkSectorName(name, sortedSectors(db));
  const { sectorMatchThreshold, sectorReviewThreshold } = db.settings.ai;
  if (raw.decision === 'match' && raw.confidence >= sectorMatchThreshold) return raw;
  if (raw.confidence >= sectorReviewThreshold) return { decision: 'review' as const, sector: null, confidence: raw.confidence };
  return { decision: 'new' as const, sector: null, confidence: raw.confidence };
}

/**
 * The model flags photos with a confidence score; flags below the configured
 * threshold are treated as a pass so moderators aren't flooded with weak signals.
 */
function applyPhotoThresholds(result: JobAnalysisComplete, ai: PlatformSettings['ai']): JobAnalysisComplete {
  if (result.verdict === 'unsafe' && result.confidence < ai.photoSafetyThreshold) {
    return { ...result, verdict: 'pass', safety: 'caution' };
  }
  if (result.verdict === 'rejected' && result.confidence < ai.authenticityThreshold) {
    return { ...result, verdict: 'pass', rejectionReason: null, authenticity: 'authentic' };
  }
  return result;
}

function ownJob(request: MockRequest): DbJob {
  const user = caller(request);
  const job = request.db.jobs.find((candidate) => candidate.id === request.params.id);
  if (!job || job.hirerId !== user.id) throw fail.notFound();
  return job;
}

function readLocation(body: Record<string, unknown>): JobLocation {
  const raw = body.location;
  if (!isPlainObject(raw)) throw fail.validation({ location: 'required' });
  const area = readString(raw, 'area', { optional: true, max: 40 });
  return {
    area: area === '' ? null : area,
    city: readString(raw, 'city', { min: 2, max: 40 }),
    district: readString(raw, 'district', { min: 2, max: 40 }),
    state: readString(raw, 'state', { min: 2, max: 40 }),
    pincode: readString(raw, 'pincode', { pattern: PINCODE }),
  };
}

type JobFields = Omit<DbJob, 'id' | 'hirerId' | 'photos' | 'difficulty' | 'safety' | 'status' | 'createdAt' | 'updatedAt' | 'analysis'>;

/** Reads the JobInput fields present in `body`. `partial` allows PATCH semantics. */
function readJobInput(db: MockDb, body: Record<string, unknown>, partial: boolean): Partial<JobFields> {
  const out: Partial<JobFields> = {};
  const has = (key: string) => !partial || key in body;

  if (has('sectorId') || has('proposedSectorName')) {
    const sectorId = typeof body.sectorId === 'string' && body.sectorId ? body.sectorId : null;
    const proposed = typeof body.proposedSectorName === 'string' ? body.proposedSectorName.trim() : '';
    if ((sectorId === null) === (proposed === '')) throw fail.validation({ sectorId: 'exactly_one' });
    if (sectorId) {
      if (!db.sectors.some((sector) => sector.id === sectorId)) throw fail.validation({ sectorId: 'unknown' });
      Object.assign(out, { sectorId, proposedSectorName: null, sectorDecision: 'match' });
    } else {
      if (proposed.length < 2 || proposed.length > 40) throw fail.validation({ proposedSectorName: 'length' });
      const check = sectorDecisionWithThresholds(db, proposed);
      if (check.decision === 'match' && check.sector) {
        Object.assign(out, { sectorId: check.sector.id, proposedSectorName: null, sectorDecision: 'match' });
      } else {
        Object.assign(out, { sectorId: null, proposedSectorName: proposed, sectorDecision: check.decision });
      }
    }
  }
  if (has('title')) out.title = readString(body, 'title', { min: 4, max: 60 });
  if (has('description')) out.description = readString(body, 'description', { min: 30, max: 1000 });
  if (has('salary')) {
    const salary = body.salary;
    if (!isPlainObject(salary)) throw fail.validation({ salary: 'required' });
    out.salary = { type: readEnum(salary, 'type', SALARY_TYPES), amount: readNumber(salary, 'amount', 50, 200000) };
  }
  if (has('shift')) out.shift = readEnum(body, 'shift', SHIFTS);
  if (has('timings')) {
    const timings = body.timings;
    out.timings = isPlainObject(timings)
      ? { start: readString(timings, 'start', { pattern: TIME }), end: readString(timings, 'end', { pattern: TIME }) }
      : null;
  }
  if (has('openings')) out.openings = readNumber(body, 'openings', 1, 50);
  if (has('location')) out.location = readLocation(body);
  if (has('requirements')) out.requirements = readStringArray(body, 'requirements', 10, 80);
  if (has('benefits')) out.benefits = readStringArray(body, 'benefits', 10, 80);
  if (has('languages')) {
    const languages = readStringArray(body, 'languages', LANGUAGE_CODES.length, 2);
    if (languages.length === 0 || !languages.every((code) => (LANGUAGE_CODES as readonly string[]).includes(code))) {
      throw fail.validation({ languages: 'invalid' });
    }
    out.languages = languages as LanguageCode[];
  }
  return out;
}

function assertVerifiedHirer(user: DbUser): void {
  if (user.hirer?.aadhaar.status !== 'verified') throw fail.forbidden('NOT_VERIFIED');
}

function openModeration(db: MockDb, job: DbJob, kind: 'sector_suggestion' | 'workplace_photos'): void {
  const exists = db.moderation.some((item) => item.jobId === job.id && item.kind === kind && item.status === 'open');
  if (exists) return;
  db.moderation.push({
    id: newId('mod'),
    kind,
    status: 'open',
    createdAt: nowIso(),
    jobId: job.id,
    sectorSuggestion:
      kind === 'sector_suggestion' && job.proposedSectorName
        ? {
            proposedName: job.proposedSectorName,
            decision: job.sectorDecision === 'review' ? 'review' : 'new',
            confidence: checkSectorName(job.proposedSectorName, sortedSectors(db)).confidence,
          }
        : null,
    note: null,
  });
}

/** Called on every analysis poll: once the simulated delay has passed, the verdict takes effect. */
function settleAnalysis(db: MockDb, job: DbJob): void {
  if (job.status !== 'analysing' || !job.analysis) return;
  if (Date.now() - new Date(job.analysis.startedAt).getTime() < ANALYSIS_DURATION_MS) return;
  const result = job.analysis.result;
  job.difficulty = result.difficulty;
  job.safety = result.safety;
  job.updatedAt = nowIso();
  if (result.verdict === 'unsafe') {
    job.status = 'pending_review';
    openModeration(db, job, 'workplace_photos');
    notify(db, job.hirerId, 'job_review', { jobTitle: job.title, status: 'pending_review' }, { kind: 'job', id: job.id });
  } else {
    job.status = 'draft';
  }
}

const PENDING_STATES: readonly DbJob['status'][] = ['draft', 'analysing', 'pending_review', 'rejected'];
const CLOSED_STATES: readonly DbJob['status'][] = ['closed', 'taken_down'];

export const adminRoutes: Route[] = [
  route('POST', '/sectors/check', ['admin'], ({ body, db }) => {
    const name = readString(body, 'name', { min: 2, max: 40 });
    return ok(sectorDecisionWithThresholds(db, name));
  }),

  route('POST', '/admin/jobs', ['admin'], (request) => {
    const user = caller(request);
    assertVerifiedHirer(user);
    const fields = readJobInput(request.db, request.body, false) as JobFields;
    const now = nowIso();
    const job: DbJob = {
      ...fields,
      id: newId('job'),
      hirerId: user.id,
      photos: [],
      difficulty: null,
      safety: null,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      analysis: null,
    };
    request.db.jobs.push(job);
    return created(toJobDetail(job, request.db, user));
  }),

  route('PATCH', '/admin/jobs/:id', ['admin'], (request) => {
    const job = ownJob(request);
    if (CLOSED_STATES.includes(job.status)) throw fail.conflict('JOB_CLOSED');
    const before = job.sectorId;
    Object.assign(job, readJobInput(request.db, request.body, true), { updatedAt: nowIso() });
    // Changing the sector of a live job sends it back for review.
    if (job.status === 'active' && (job.sectorId !== before || job.sectorId === null)) {
      job.status = 'pending_review';
      if (job.sectorId === null) openModeration(request.db, job, 'sector_suggestion');
    }
    return ok(toJobDetail(job, request.db, caller(request)));
  }),

  route('POST', '/admin/jobs/:id/photos', ['admin'], async (request) => {
    const job = ownJob(request);
    if (job.status !== 'draft' && job.status !== 'rejected') throw fail.conflict('INVALID_STATE');
    const photos = request.form?.files.photos ?? [];
    if (photos.length < 3 || photos.length > 6) throw fail.validation({ photos: 'count' });
    photos.forEach((photo) => assertUploadAllowed(photo, 'image'));
    const note = request.form?.fields.note?.[0] ?? '';

    const stored: DbJob['photos'] = [];
    for (const photo of photos) stored.push({ id: newId('ph'), url: await storeUpload(photo) });

    const sectorSlug = request.db.sectors.find((sector) => sector.id === job.sectorId)?.slug ?? null;
    const photoNames = photos.map((photo) => photo.name);
    const result = applyPhotoThresholds(analyseWorkplacePhotos({ photoNames, note, sectorSlug }), request.db.settings.ai);
    job.photos = stored;
    job.status = 'analysing';
    job.analysis = { startedAt: nowIso(), photoNames, note, result };
    job.updatedAt = nowIso();
    return accepted({ status: 'analysing' });
  }),

  route('GET', '/admin/jobs/:id/analysis', ['admin'], (request) => {
    const job = ownJob(request);
    if (!job.analysis) throw fail.notFound();
    settleAnalysis(request.db, job);
    if (job.status === 'analysing') return ok({ status: 'analysing', startedAt: job.analysis.startedAt });
    return ok(job.analysis.result);
  }),

  route('POST', '/admin/jobs/:id/submit', ['admin'], (request) => {
    const job = ownJob(request);
    settleAnalysis(request.db, job);
    if (job.status !== 'draft' || job.analysis?.result.verdict !== 'pass') throw fail.conflict('NOT_READY');
    if (job.sectorId && job.sectorDecision === 'match') {
      job.status = 'active';
    } else {
      job.status = 'pending_review';
      openModeration(request.db, job, 'sector_suggestion');
      notify(request.db, job.hirerId, 'job_review', { jobTitle: job.title, status: 'pending_review' }, { kind: 'job', id: job.id });
    }
    job.updatedAt = nowIso();
    return ok(toJobDetail(job, request.db, caller(request)));
  }),

  route('POST', '/admin/jobs/:id/close', ['admin'], (request) => {
    const job = ownJob(request);
    if (CLOSED_STATES.includes(job.status)) throw fail.conflict('JOB_CLOSED');
    job.status = 'closed';
    job.updatedAt = nowIso();
    return ok(toJobDetail(job, request.db, caller(request)));
  }),

  route('GET', '/admin/jobs', ['admin'], (request) => {
    const user = caller(request);
    const { db, query } = request;
    db.jobs.filter((job) => job.hirerId === user.id).forEach((job) => settleAnalysis(db, job));
    const state = query.state === 'pending' || query.state === 'closed' ? query.state : 'active';
    const jobs = db.jobs
      .filter((job) => job.hirerId === user.id)
      .filter((job) => {
        if (state === 'active') return job.status === 'active';
        if (state === 'pending') return PENDING_STATES.includes(job.status);
        return CLOSED_STATES.includes(job.status);
      })
      .sort(byNewest);
    const page = paginate(jobs, query);
    return ok({ ...page, items: page.items.map((job) => toJobSummary(job, db, null)) });
  }),

  route('GET', '/admin/dashboard', ['admin'], (request) => {
    const user = caller(request);
    const { db } = request;
    applyAutoVerification(db, user);
    const myJobs = db.jobs.filter((job) => job.hirerId === user.id);
    const myJobIds = new Set(myJobs.map((job) => job.id));
    const applications = db.applications.filter((app) => myJobIds.has(app.jobId)).sort(byNewest);
    return ok({
      stats: {
        activeJobs: myJobs.filter((job) => job.status === 'active').length,
        newApplicants: applications.filter((app) => !app.seenByHirer).length,
        hires: applications.filter((app) => app.status === 'hired').length,
        pendingReview: myJobs.filter((job) => job.status === 'pending_review').length,
      },
      verificationStatus: user.hirer?.aadhaar.status ?? 'none',
      rejectionReason: user.hirer?.aadhaar.rejectionReason ?? null,
      recentApplicants: applications.slice(0, 5).map((app) => toApplicantSummary(app, db)),
    });
  }),
];
