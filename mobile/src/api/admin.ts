import type { LocalFile, Page, PageParams, UploadProgressHandler } from '../lib/types/common';
import type { AdminDashboard, AdminJobState, JobAnalysis, JobDetail, JobInput, JobSummary } from '../lib/types/jobs';
import { api, multipartConfig } from './client';

const jobPath = (jobId: string) => `/admin/jobs/${encodeURIComponent(jobId)}`;

export async function createJob(input: JobInput): Promise<JobDetail> {
  const { data } = await api.post<JobDetail>('/admin/jobs', input);
  return data;
}

export async function updateJob(jobId: string, patch: Partial<JobInput>): Promise<JobDetail> {
  const { data } = await api.patch<JobDetail>(jobPath(jobId), patch);
  return data;
}

export async function uploadJobPhotos(
  jobId: string,
  photos: readonly LocalFile[],
  note: string,
  onProgress?: UploadProgressHandler,
): Promise<{ status: 'analysing' }> {
  const form = new FormData();
  photos.forEach((photo) => form.append('photos', { uri: photo.uri, name: photo.name, type: photo.mimeType }));
  if (note) form.append('note', note);
  const { data } = await api.post<{ status: 'analysing' }>(`${jobPath(jobId)}/photos`, form, multipartConfig(onProgress));
  return data;
}

export async function getJobAnalysis(jobId: string): Promise<JobAnalysis> {
  const { data } = await api.get<JobAnalysis>(`${jobPath(jobId)}/analysis`);
  return data;
}

export async function submitJob(jobId: string): Promise<JobDetail> {
  const { data } = await api.post<JobDetail>(`${jobPath(jobId)}/submit`);
  return data;
}

export async function closeJob(jobId: string): Promise<JobDetail> {
  const { data } = await api.post<JobDetail>(`${jobPath(jobId)}/close`);
  return data;
}

export async function getMyPostedJobs(state: AdminJobState, params: PageParams): Promise<Page<JobSummary>> {
  const { data } = await api.get<Page<JobSummary>>('/admin/jobs', { params: { ...params, state } });
  return data;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await api.get<AdminDashboard>('/admin/dashboard');
  return data;
}
