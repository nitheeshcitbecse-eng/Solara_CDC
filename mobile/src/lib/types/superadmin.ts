import type { LanguageCode } from '../i18n/languages';
import type { Application } from './applications';
import type { AccountStatus, Role, VerificationStatus } from './auth';
import type { PageParams } from './common';
import type { JobAnalysis, JobPhoto, JobStatus, JobSummary } from './jobs';
import type { HirerProfile, SeekerProfile } from './profile';
import type { ReportReason, ReportTargetType } from './support';

export type TrendPoint = { date: string; count: number };

export type Overview = {
  kpis: {
    jobSeekers: number;
    hirers: number;
    activeJobs: number;
    applicationsToday: number;
    pendingVerifications: number;
    openReports: number;
    moderationQueue: number;
    hiresThisMonth: number;
  };
  trends: { applications: TrendPoint[]; signups: TrendPoint[] };
};

export type ManagedRole = Exclude<Role, 'superadmin'>;

export type AdminUserListItem = {
  id: string;
  role: ManagedRole;
  name: string | null;
  phone: string | null;
  city: string | null;
  status: AccountStatus;
  verificationStatus: VerificationStatus;
  createdAt: string;
};

type UserDocument = {
  id: string;
  kind: 'aadhaar_front' | 'aadhaar_back';
  mimeType: string;
  uploadedAt: string;
};

export type AdminUserDetail = AdminUserListItem & {
  email: string | null;
  statusReason: string | null;
  seeker: SeekerProfile | null;
  hirer: HirerProfile | null;
  documents: UserDocument[];
  applications: Application[];
  jobs: JobSummary[];
};

export type UserListParams = PageParams & { role: ManagedRole; status?: AccountStatus; q?: string };
export type UserStatusBody = { status: AccountStatus; reason: string };
export type VerificationDecisionBody = { decision: 'verified' | 'rejected'; reason?: string };
export type DocumentUrlResponse = { url: string; expiresAt: string };

export type SuperJobListParams = PageParams & { status?: JobStatus; q?: string };
type SuperJobAction = 'approve' | 'reject' | 'take_down';
export type SuperJobActionBody = { action: SuperJobAction; reason?: string };

export type ModerationItem = {
  id: string;
  kind: 'sector_suggestion' | 'workplace_photos';
  status: 'open' | 'approved' | 'rejected';
  createdAt: string;
  job: { id: string; title: string; hirerName: string };
  sectorSuggestion: { proposedName: string; decision: 'new' | 'review'; confidence: number } | null;
  photos: JobPhoto[];
  analysis: JobAnalysis | null;
  note: string | null;
};

export type ModerationListParams = PageParams & { status: 'open' | 'closed' };
export type ModerationDecisionBody = {
  decision: 'approve' | 'reject';
  note: string;
  sectorId?: string;
  sectorName?: string;
};

export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type Report = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  reporter: { id: string; name: string };
  createdAt: string;
  resolutionNote: string | null;
};
export type ReportListParams = PageParams & { status?: ReportStatus };
export type ReportDecisionBody = { status: 'resolved' | 'dismissed'; note: string };

export const AUDIT_ACTIONS = [
  'auth.login',
  'user.suspend',
  'user.ban',
  'user.reactivate',
  'verification.approve',
  'verification.reject',
  'job.approve',
  'job.reject',
  'job.take_down',
  'moderation.approve',
  'moderation.reject',
  'report.resolve',
  'report.dismiss',
  'settings.update',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditLog = {
  id: string;
  actor: { id: string; name: string; role: Role };
  action: AuditAction;
  target: { type: string; id: string; label: string };
  reason: string | null;
  createdAt: string;
};
export type AuditLogParams = PageParams & { action?: AuditAction; q?: string };

export type PlatformSettings = {
  ai: {
    sectorMatchThreshold: number;
    sectorReviewThreshold: number;
    photoSafetyThreshold: number;
    authenticityThreshold: number;
  };
  otp: { maxRequestsPerHour: number; resendAfterSec: number; expirySec: number };
  enabledLanguages: LanguageCode[];
};

export type PlatformSettingsPatch = {
  ai?: Partial<PlatformSettings['ai']>;
  otp?: Partial<PlatformSettings['otp']>;
  enabledLanguages?: LanguageCode[];
};
