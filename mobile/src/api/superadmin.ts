import type { Page } from '../lib/types/common';
import type { JobDetail, JobSummary } from '../lib/types/jobs';
import type {
  AdminUserDetail,
  AdminUserListItem,
  AuditLog,
  AuditLogParams,
  DocumentUrlResponse,
  ModerationDecisionBody,
  ModerationItem,
  ModerationListParams,
  Overview,
  PlatformSettings,
  PlatformSettingsPatch,
  Report,
  ReportDecisionBody,
  ReportListParams,
  SuperJobActionBody,
  SuperJobListParams,
  UserListParams,
  UserStatusBody,
  VerificationDecisionBody,
} from '../lib/types/superadmin';
import { api } from './client';

const id = encodeURIComponent;

export async function getOverview(): Promise<Overview> {
  const { data } = await api.get<Overview>('/superadmin/overview');
  return data;
}

export async function getUsers(params: UserListParams): Promise<Page<AdminUserListItem>> {
  const { data } = await api.get<Page<AdminUserListItem>>('/superadmin/users', { params });
  return data;
}

export async function getUser(userId: string): Promise<AdminUserDetail> {
  const { data } = await api.get<AdminUserDetail>(`/superadmin/users/${id(userId)}`);
  return data;
}

export async function setUserStatus(userId: string, body: UserStatusBody): Promise<AdminUserDetail> {
  const { data } = await api.patch<AdminUserDetail>(`/superadmin/users/${id(userId)}/status`, body);
  return data;
}

export async function decideVerification(userId: string, body: VerificationDecisionBody): Promise<AdminUserDetail> {
  const { data } = await api.patch<AdminUserDetail>(`/superadmin/users/${id(userId)}/verification`, body);
  return data;
}

export async function getDocumentUrl(documentId: string): Promise<DocumentUrlResponse> {
  const { data } = await api.get<DocumentUrlResponse>(`/superadmin/documents/${id(documentId)}/url`);
  return data;
}

export async function getAllJobs(params: SuperJobListParams): Promise<Page<JobSummary>> {
  const { data } = await api.get<Page<JobSummary>>('/superadmin/jobs', { params });
  return data;
}

export async function actOnJob(jobId: string, body: SuperJobActionBody): Promise<JobDetail> {
  const { data } = await api.patch<JobDetail>(`/superadmin/jobs/${id(jobId)}`, body);
  return data;
}

export async function getModerationQueue(params: ModerationListParams): Promise<Page<ModerationItem>> {
  const { data } = await api.get<Page<ModerationItem>>('/superadmin/moderation', { params });
  return data;
}

export async function decideModeration(itemId: string, body: ModerationDecisionBody): Promise<ModerationItem> {
  const { data } = await api.post<ModerationItem>(`/superadmin/moderation/${id(itemId)}/decision`, body);
  return data;
}

export async function getReports(params: ReportListParams): Promise<Page<Report>> {
  const { data } = await api.get<Page<Report>>('/superadmin/reports', { params });
  return data;
}

export async function decideReport(reportId: string, body: ReportDecisionBody): Promise<Report> {
  const { data } = await api.patch<Report>(`/superadmin/reports/${id(reportId)}`, body);
  return data;
}

export async function getAuditLogs(params: AuditLogParams): Promise<Page<AuditLog>> {
  const { data } = await api.get<Page<AuditLog>>('/superadmin/audit-logs', { params });
  return data;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { data } = await api.get<PlatformSettings>('/superadmin/settings');
  return data;
}

export async function updatePlatformSettings(patch: PlatformSettingsPatch): Promise<PlatformSettings> {
  const { data } = await api.patch<PlatformSettings>('/superadmin/settings', patch);
  return data;
}
