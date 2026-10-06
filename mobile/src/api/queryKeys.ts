import type { ApplicationStatus } from '../lib/types/applications';
import type { AdminJobState, EngagementState, JobSearchParams } from '../lib/types/jobs';
import type {
  AuditLogParams,
  ModerationListParams,
  ReportListParams,
  SuperJobListParams,
  UserListParams,
} from '../lib/types/superadmin';

/**
 * The single source of TanStack Query keys. Keys are hierarchical, so invalidating
 * a prefix (e.g. queryKeys.jobs.all) refreshes every list and detail beneath it.
 */
export const queryKeys = {
  me: ['me'] as const,
  sectors: ['sectors'] as const,

  jobs: {
    all: ['jobs'] as const,
    lists: () => ['jobs', 'list'] as const,
    list: (params: Omit<JobSearchParams, 'page'>) => ['jobs', 'list', params] as const,
    detail: (jobId: string) => ['jobs', 'detail', jobId] as const,
    saved: () => ['jobs', 'saved'] as const,
    engagements: (state: EngagementState) => ['jobs', 'engagements', state] as const,
  },

  applications: {
    all: ['applications'] as const,
    mine: (status?: ApplicationStatus) => ['applications', 'mine', status ?? 'all'] as const,
    detail: (applicationId: string) => ['applications', 'detail', applicationId] as const,
  },

  admin: {
    all: ['admin'] as const,
    dashboard: () => ['admin', 'dashboard'] as const,
    jobs: (state: AdminJobState) => ['admin', 'jobs', state] as const,
    analysis: (jobId: string) => ['admin', 'analysis', jobId] as const,
    /** Prefix covering every status filter of one job's applicant list. */
    applicantsForJob: (jobId: string) => ['admin', 'applicants', jobId] as const,
    applicants: (jobId: string, status?: ApplicationStatus) => ['admin', 'applicants', jobId, status ?? 'all'] as const,
    applicant: (applicationId: string) => ['admin', 'applicant', applicationId] as const,
  },

  conversations: {
    all: ['conversations'] as const,
    list: () => ['conversations', 'list'] as const,
    messages: (conversationId: string) => ['conversations', 'messages', conversationId] as const,
  },

  notifications: {
    all: ['notifications'] as const,
  },

  help: {
    faqs: (language: string) => ['help', 'faqs', language] as const,
  },

  superadmin: {
    all: ['superadmin'] as const,
    overview: () => ['superadmin', 'overview'] as const,
    users: (params: Omit<UserListParams, 'page'>) => ['superadmin', 'users', params] as const,
    user: (userId: string) => ['superadmin', 'user', userId] as const,
    document: (documentId: string) => ['superadmin', 'document', documentId] as const,
    jobs: (params: Omit<SuperJobListParams, 'page'>) => ['superadmin', 'jobs', params] as const,
    moderation: (params: Omit<ModerationListParams, 'page'>) => ['superadmin', 'moderation', params] as const,
    reports: (params: Omit<ReportListParams, 'page'>) => ['superadmin', 'reports', params] as const,
    auditLogs: (params: Omit<AuditLogParams, 'page'>) => ['superadmin', 'audit', params] as const,
    settings: () => ['superadmin', 'settings'] as const,
  },
} as const;
