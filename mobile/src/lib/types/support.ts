export type Faq = { id: string; question: string; answer: string };

export type SupportTopic = 'account' | 'jobs' | 'payments' | 'safety' | 'other';
export const SUPPORT_TOPICS: readonly SupportTopic[] = ['account', 'jobs', 'payments', 'safety', 'other'];

export type SupportTicketBody = { topic: SupportTopic; message: string };
export type SupportTicketResponse = { id: string; createdAt: string };

export type ReportTargetType = 'job' | 'user' | 'message';
export type ReportReason = 'fraud' | 'unsafe' | 'inappropriate' | 'misleading' | 'other';
export const REPORT_REASONS: readonly ReportReason[] = ['fraud', 'unsafe', 'inappropriate', 'misleading', 'other'];

export type ReportBody = { targetType: ReportTargetType; targetId: string; reason: ReportReason; details: string };
export type ReportResponse = { id: string };
