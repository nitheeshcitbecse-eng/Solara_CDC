import type {
  Application,
  ApplicationListParams,
  ApplicantDetail,
  ApplicantSummary,
  ApplyInput,
  HirerDecision,
} from '../lib/types/applications';
import type { Page, UploadProgressHandler } from '../lib/types/common';
import type { Conversation } from '../lib/types/messages';
import { api, multipartConfig } from './client';

export async function applyToJob(jobId: string, input: ApplyInput, onProgress?: UploadProgressHandler): Promise<Application> {
  const form = new FormData();
  form.append('message', input.message);
  form.append('voiceIntro', { uri: input.voiceIntro.uri, name: input.voiceIntro.name, type: input.voiceIntro.mimeType });
  form.append('voiceDurationSec', String(input.voiceIntro.durationSec));
  if (input.expectedSalary !== null) form.append('expectedSalary', String(input.expectedSalary));
  if (input.availableFrom) form.append('availableFrom', input.availableFrom);
  form.append('sharePhone', input.sharePhone ? 'true' : 'false');
  const { data } = await api.post<Application>(`/jobs/${encodeURIComponent(jobId)}/applications`, form, multipartConfig(onProgress));
  return data;
}

export async function getMyApplications(params: ApplicationListParams): Promise<Page<Application>> {
  const { data } = await api.get<Page<Application>>('/me/applications', { params });
  return data;
}

export async function getMyApplication(applicationId: string): Promise<Application> {
  const { data } = await api.get<Application>(`/me/applications/${encodeURIComponent(applicationId)}`);
  return data;
}

export async function getJobApplicants(jobId: string, params: ApplicationListParams): Promise<Page<ApplicantSummary>> {
  const { data } = await api.get<Page<ApplicantSummary>>(`/admin/jobs/${encodeURIComponent(jobId)}/applications`, { params });
  return data;
}

export async function getApplicant(applicationId: string): Promise<ApplicantDetail> {
  const { data } = await api.get<ApplicantDetail>(`/admin/applications/${encodeURIComponent(applicationId)}`);
  return data;
}

export async function decideApplication(applicationId: string, status: HirerDecision): Promise<ApplicantDetail> {
  const { data } = await api.patch<ApplicantDetail>(`/admin/applications/${encodeURIComponent(applicationId)}`, { status });
  return data;
}

export async function openApplicationConversation(applicationId: string): Promise<Conversation> {
  const { data } = await api.post<Conversation>(`/applications/${encodeURIComponent(applicationId)}/conversation`);
  return data;
}
