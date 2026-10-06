import type { Application, ApplicantDetail, ApplicantSummary } from '../../lib/types/applications';
import type { SessionUser } from '../../lib/types/auth';
import type { JobDetail, JobSummary, Sector } from '../../lib/types/jobs';
import type { AppNotification, Conversation, Message } from '../../lib/types/messages';
import type { Me } from '../../lib/types/profile';
import type { AdminUserDetail, AdminUserListItem, AuditLog, ModerationItem, Report } from '../../lib/types/superadmin';
import { ageFrom, firstNameOf } from '../../utils/format';
import type {
  DbApplication,
  DbAuditLog,
  DbConversation,
  DbJob,
  DbMessage,
  DbModeration,
  DbNotification,
  DbReport,
  DbSector,
  DbUser,
  MockDb,
} from './db';

export function findUser(db: MockDb, id: string): DbUser | undefined {
  return db.users.find((user) => user.id === id);
}

export function displayName(user: DbUser | undefined): string {
  if (!user) return '';
  return user.hirer?.businessName ?? user.hirer?.name ?? user.seeker?.fullName ?? user.name ?? '';
}

function verificationOf(user: DbUser): SessionUser['verificationStatus'] {
  return user.seeker?.aadhaar.status ?? user.hirer?.aadhaar.status ?? 'none';
}

export function toSessionUser(user: DbUser): SessionUser {
  const name = user.seeker?.fullName ?? user.hirer?.name ?? user.name;
  return {
    id: user.id,
    role: user.role,
    phone: user.phone,
    email: user.email,
    name,
    firstName: firstNameOf(name) || null,
    profileComplete: user.profileComplete,
    verificationStatus: user.role === 'superadmin' ? 'verified' : verificationOf(user),
  };
}

export function toMe(user: DbUser): Me {
  return {
    user: toSessionUser(user),
    seeker: user.seeker,
    hirer: user.hirer,
    settings: user.settings,
    deletionRequestedAt: user.deletionRequestedAt,
  };
}

export function toSector(sector: DbSector, db: MockDb): Sector {
  const jobCount = db.jobs.filter((job) => job.sectorId === sector.id && job.status === 'active').length;
  return { id: sector.id, slug: sector.slug, name: sector.name, jobCount };
}

export function toJobSummary(job: DbJob, db: MockDb, viewer: DbUser | null): JobSummary {
  const hirer = findUser(db, job.hirerId);
  const sector = job.sectorId ? db.sectors.find((candidate) => candidate.id === job.sectorId) : undefined;
  return {
    id: job.id,
    title: job.title,
    sector: sector ? { id: sector.id, slug: sector.slug, name: sector.name } : null,
    proposedSectorName: job.proposedSectorName,
    hirer: {
      id: job.hirerId,
      displayName: displayName(hirer),
      verified: hirer?.hirer?.aadhaar.status === 'verified',
    },
    salary: job.salary,
    shift: job.shift,
    location: job.location,
    openings: job.openings,
    difficulty: job.difficulty,
    status: job.status,
    createdAt: job.createdAt,
    saved: viewer?.savedJobIds.includes(job.id) ?? false,
    applied: viewer ? db.applications.some((app) => app.jobId === job.id && app.seekerId === viewer.id) : false,
    applicantCount: db.applications.filter((app) => app.jobId === job.id).length,
  };
}

export function toJobDetail(job: DbJob, db: MockDb, viewer: DbUser | null): JobDetail {
  const myApplication = viewer ? db.applications.find((app) => app.jobId === job.id && app.seekerId === viewer.id) : undefined;
  return {
    ...toJobSummary(job, db, viewer),
    description: job.description,
    timings: job.timings,
    requirements: job.requirements,
    languages: job.languages,
    benefits: job.benefits,
    photos: job.photos,
    safety: job.safety,
    myApplicationId: myApplication?.id ?? null,
  };
}

export function toApplication(app: DbApplication, db: MockDb, viewer: DbUser): Application | null {
  const job = db.jobs.find((candidate) => candidate.id === app.jobId);
  if (!job) return null;
  return {
    id: app.id,
    job: toJobSummary(job, db, viewer),
    status: app.status,
    createdAt: app.createdAt,
    message: app.message,
    voiceIntro: app.voiceIntro,
    expectedSalary: app.expectedSalary,
    availableFrom: app.availableFrom,
    sharePhone: app.sharePhone,
    timeline: app.timeline,
    conversationId: app.conversationId,
  };
}

export function toApplicantSummary(app: DbApplication, db: MockDb): ApplicantSummary {
  const seeker = findUser(db, app.seekerId);
  const job = db.jobs.find((candidate) => candidate.id === app.jobId);
  return {
    id: app.id,
    jobId: app.jobId,
    jobTitle: job?.title ?? '',
    status: app.status,
    createdAt: app.createdAt,
    applicant: {
      id: app.seekerId,
      name: seeker?.seeker?.fullName ?? seeker?.name ?? '',
      city: seeker?.seeker?.city ?? null,
      verified: seeker?.seeker?.aadhaar.status === 'verified',
      skills: seeker?.seeker?.skills ?? [],
    },
  };
}

export function toApplicantDetail(app: DbApplication, db: MockDb): ApplicantDetail {
  const seeker = findUser(db, app.seekerId);
  const profile = seeker?.seeker;
  return {
    ...toApplicantSummary(app, db),
    message: app.message,
    voiceIntro: app.voiceIntro,
    expectedSalary: app.expectedSalary,
    availableFrom: app.availableFrom,
    // Consent rule: hirers only see the number when the seeker opted in for this application.
    phone: app.sharePhone ? (seeker?.phone ?? null) : null,
    profile: {
      qualification: profile?.qualification ?? null,
      languagesKnown: profile?.languagesKnown ?? [],
      workHistory: profile?.workHistory ?? [],
      currentWork: profile?.currentWork ?? null,
      age: profile?.dateOfBirth ? ageFrom(profile.dateOfBirth) : null,
    },
    timeline: app.timeline,
    conversationId: app.conversationId,
  };
}

export function toMessage(message: DbMessage, viewerId: string): Message {
  return {
    id: message.id,
    conversationId: message.conversationId,
    fromMe: message.senderId === viewerId,
    text: message.text,
    createdAt: message.createdAt,
  };
}

export function toConversation(conversation: DbConversation, db: MockDb, viewerId: string): Conversation {
  const otherId = conversation.seekerId === viewerId ? conversation.hirerId : conversation.seekerId;
  const other = findUser(db, otherId);
  const job = conversation.jobId ? db.jobs.find((candidate) => candidate.id === conversation.jobId) : undefined;
  const messages = db.messages
    .filter((message) => message.conversationId === conversation.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const last = messages[messages.length - 1];
  const lastReadAt = conversation.lastReadAt[viewerId] ?? '';
  return {
    id: conversation.id,
    participant: {
      id: otherId,
      name: other?.role === 'admin' ? displayName(other) : (other?.seeker?.fullName ?? other?.name ?? ''),
      role: other?.role ?? 'user',
    },
    job: job ? { id: job.id, title: job.title } : null,
    lastMessage: last ? { text: last.text, at: last.createdAt, fromMe: last.senderId === viewerId } : null,
    unreadCount: messages.filter((message) => message.senderId !== viewerId && message.createdAt > lastReadAt).length,
  };
}

export function toNotification(notification: DbNotification): AppNotification {
  return {
    id: notification.id,
    type: notification.type,
    read: notification.read,
    createdAt: notification.createdAt,
    params: notification.params,
    target: notification.target,
  };
}

export function toAdminUserListItem(user: DbUser): AdminUserListItem {
  return {
    id: user.id,
    role: user.role === 'admin' ? 'admin' : 'user',
    name: user.seeker?.fullName ?? user.hirer?.name ?? user.name,
    phone: user.phone,
    city: user.seeker?.city ?? user.hirer?.address?.city ?? null,
    status: user.status,
    verificationStatus: verificationOf(user),
    createdAt: user.createdAt,
  };
}

export function toAdminUserDetail(user: DbUser, db: MockDb): AdminUserDetail {
  return {
    ...toAdminUserListItem(user),
    email: user.email ?? user.seeker?.email ?? null,
    statusReason: user.statusReason,
    seeker: user.seeker,
    hirer: user.hirer,
    documents: db.documents
      .filter((document) => document.ownerId === user.id)
      .map(({ id, kind, mimeType, uploadedAt }) => ({ id, kind, mimeType, uploadedAt })),
    applications: db.applications
      .filter((app) => app.seekerId === user.id)
      .map((app) => toApplication(app, db, user))
      .filter((app): app is Application => app !== null),
    jobs: db.jobs.filter((job) => job.hirerId === user.id).map((job) => toJobSummary(job, db, null)),
  };
}

export function toModerationItem(item: DbModeration, db: MockDb): ModerationItem {
  const job = db.jobs.find((candidate) => candidate.id === item.jobId);
  const hirer = job ? findUser(db, job.hirerId) : undefined;
  return {
    id: item.id,
    kind: item.kind,
    status: item.status,
    createdAt: item.createdAt,
    job: { id: item.jobId, title: job?.title ?? '', hirerName: displayName(hirer) },
    sectorSuggestion: item.sectorSuggestion,
    photos: job?.photos ?? [],
    analysis: job?.analysis?.result ?? null,
    note: item.note,
  };
}

export function toReport(report: DbReport, db: MockDb): Report {
  const reporter = findUser(db, report.reporterId);
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    targetLabel: report.targetLabel,
    reason: report.reason,
    details: report.details,
    status: report.status,
    reporter: { id: report.reporterId, name: reporter?.seeker?.fullName ?? reporter?.hirer?.name ?? reporter?.name ?? '' },
    createdAt: report.createdAt,
    resolutionNote: report.resolutionNote,
  };
}

export function toAuditLog(log: DbAuditLog, db: MockDb): AuditLog {
  const actor = findUser(db, log.actorId);
  return {
    id: log.id,
    actor: { id: log.actorId, name: actor?.name ?? '', role: actor?.role ?? 'superadmin' },
    action: log.action,
    target: log.target,
    reason: log.reason,
    createdAt: log.createdAt,
  };
}
