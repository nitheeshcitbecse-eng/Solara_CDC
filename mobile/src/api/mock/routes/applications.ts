import { APPLICATION_STATUSES, type ApplicationStatus } from '../../../lib/types/applications';
import { newId, nowIso, type DbApplication, type MockDb } from '../db';
import { notify } from '../events';
import { byNewest, caller, created, fail, ok, paginate, readEnum, route, type MockRequest, type Route } from '../http';
import { displayName, toApplicantDetail, toApplicantSummary, toApplication } from '../serializers';
import { assertUploadAllowed, storeUpload } from '../uploads';

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  applied: ['shortlisted', 'hired', 'rejected'],
  shortlisted: ['hired', 'rejected'],
  hired: [],
  rejected: [],
};

const HIRER_DECISIONS = ['shortlisted', 'hired', 'rejected'] as const;

function field(request: MockRequest, key: string): string {
  return request.form?.fields[key]?.[0]?.trim() ?? '';
}

/** The application, provided it belongs to one of the calling hirer's jobs. */
function hirerApplication(request: MockRequest): DbApplication {
  const user = caller(request);
  const app = request.db.applications.find((candidate) => candidate.id === request.params.id);
  const job = app ? request.db.jobs.find((candidate) => candidate.id === app.jobId) : undefined;
  if (!app || !job || job.hirerId !== user.id) throw fail.notFound();
  return app;
}

function startEngagement(db: MockDb, app: DbApplication): void {
  if (db.engagements.some((engagement) => engagement.applicationId === app.id)) return;
  db.engagements.push({
    id: newId('eng'),
    applicationId: app.id,
    jobId: app.jobId,
    seekerId: app.seekerId,
    startedOn: app.availableFrom ?? nowIso().slice(0, 10),
    endedOn: null,
  });
}

export const applicationRoutes: Route[] = [
  route('POST', '/jobs/:id/applications', ['user'], async (request) => {
    const user = caller(request);
    const { db } = request;
    const job = db.jobs.find((candidate) => candidate.id === request.params.id);
    if (!job || job.status !== 'active') throw fail.notFound();
    if (db.applications.some((app) => app.jobId === job.id && app.seekerId === user.id)) throw fail.conflict('ALREADY_APPLIED');

    const message = field(request, 'message');
    if (message.length < 20 || message.length > 500) throw fail.validation({ message: 'length' });
    const voice = request.form?.files.voiceIntro?.[0];
    if (!voice) throw fail.validation({ voiceIntro: 'required' });
    assertUploadAllowed(voice, 'audio');
    const durationSec = Number(field(request, 'voiceDurationSec'));
    if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 60) throw fail.validation({ voiceDurationSec: 'range' });
    const salaryText = field(request, 'expectedSalary');
    const expectedSalary = salaryText ? Number(salaryText) : null;
    if (expectedSalary !== null && (!Number.isFinite(expectedSalary) || expectedSalary < 1000 || expectedSalary > 500000)) {
      throw fail.validation({ expectedSalary: 'range' });
    }
    const availableFrom = field(request, 'availableFrom') || null;
    if (availableFrom && !/^\d{4}-\d{2}-\d{2}$/.test(availableFrom)) throw fail.validation({ availableFrom: 'format' });

    const createdAt = nowIso();
    const app: DbApplication = {
      id: newId('app'),
      jobId: job.id,
      seekerId: user.id,
      status: 'applied',
      createdAt,
      message,
      voiceIntro: { url: await storeUpload(voice), durationSec: Math.round(durationSec) },
      expectedSalary,
      availableFrom,
      sharePhone: field(request, 'sharePhone') === 'true',
      timeline: [{ status: 'applied', at: createdAt }],
      conversationId: null,
      seenByHirer: false,
    };
    db.applications.push(app);
    notify(db, job.hirerId, 'new_applicant', { name: user.seeker?.fullName ?? '', jobTitle: job.title }, { kind: 'application', id: app.id });
    return created(toApplication(app, db, user));
  }),

  route('GET', '/me/applications', ['user'], (request) => {
    const user = caller(request);
    const { db, query } = request;
    const status = APPLICATION_STATUSES.find((candidate) => candidate === query.status);
    const apps = db.applications
      .filter((app) => app.seekerId === user.id && (!status || app.status === status))
      .sort(byNewest);
    const page = paginate(apps, query);
    return ok({ ...page, items: page.items.map((app) => toApplication(app, db, user)).filter(Boolean) });
  }),

  route('GET', '/me/applications/:id', ['user'], (request) => {
    const user = caller(request);
    const app = request.db.applications.find((candidate) => candidate.id === request.params.id && candidate.seekerId === user.id);
    const result = app ? toApplication(app, request.db, user) : null;
    if (!result) throw fail.notFound();
    return ok(result);
  }),

  route('GET', '/admin/jobs/:id/applications', ['admin'], (request) => {
    const user = caller(request);
    const { db, query } = request;
    const job = db.jobs.find((candidate) => candidate.id === request.params.id);
    if (!job || job.hirerId !== user.id) throw fail.notFound();
    const status = APPLICATION_STATUSES.find((candidate) => candidate === query.status);
    const apps = db.applications.filter((app) => app.jobId === job.id && (!status || app.status === status)).sort(byNewest);
    const page = paginate(apps, query);
    return ok({ ...page, items: page.items.map((app) => toApplicantSummary(app, db)) });
  }),

  route('GET', '/admin/applications/:id', ['admin'], (request) => {
    const app = hirerApplication(request);
    app.seenByHirer = true;
    return ok(toApplicantDetail(app, request.db));
  }),

  route('PATCH', '/admin/applications/:id', ['admin'], (request) => {
    const app = hirerApplication(request);
    const next = readEnum(request.body, 'status', HIRER_DECISIONS);
    if (!ALLOWED_TRANSITIONS[app.status].includes(next)) throw fail.conflict('INVALID_TRANSITION');
    const { db } = request;
    app.status = next;
    app.seenByHirer = true;
    app.timeline = [...app.timeline, { status: next, at: nowIso() }];
    if (next === 'hired') startEngagement(db, app);
    const job = db.jobs.find((candidate) => candidate.id === app.jobId);
    notify(db, app.seekerId, 'application_status', { jobTitle: job?.title ?? '', status: next }, { kind: 'application', id: app.id });
    return ok(toApplicantDetail(app, db));
  }),

  route('POST', '/applications/:id/conversation', ['user', 'admin'], (request) => {
    const user = caller(request);
    const { db } = request;
    const app = db.applications.find((candidate) => candidate.id === request.params.id);
    const job = app ? db.jobs.find((candidate) => candidate.id === app.jobId) : undefined;
    if (!app || !job || (app.seekerId !== user.id && job.hirerId !== user.id)) throw fail.notFound();

    let conversation = db.conversations.find((candidate) => candidate.applicationId === app.id);
    if (!conversation) {
      conversation = {
        id: newId('conv'),
        seekerId: app.seekerId,
        hirerId: job.hirerId,
        jobId: job.id,
        applicationId: app.id,
        createdAt: nowIso(),
        lastReadAt: {},
      };
      db.conversations.push(conversation);
      app.conversationId = conversation.id;
    }
    const other = db.users.find((candidate) => candidate.id === (user.id === app.seekerId ? job.hirerId : app.seekerId));
    return ok({
      id: conversation.id,
      participant: { id: other?.id ?? '', name: displayName(other), role: other?.role ?? 'user' },
      job: { id: job.id, title: job.title },
      lastMessage: null,
      unreadCount: 0,
    });
  }),
];
