import type { Page, PageParams } from '../lib/types/common';
import type { Engagement, EngagementState, JobDetail, JobSearchParams, JobSummary } from '../lib/types/jobs';
import { api } from './client';

export async function searchJobs(params: JobSearchParams): Promise<Page<JobSummary>> {
  const { data } = await api.get<Page<JobSummary>>('/jobs', { params });
  return data;
}

export async function getJob(jobId: string): Promise<JobDetail> {
  const { data } = await api.get<JobDetail>(`/jobs/${encodeURIComponent(jobId)}`);
  return data;
}

export async function saveJob(jobId: string): Promise<void> {
  await api.post(`/me/saved-jobs/${encodeURIComponent(jobId)}`);
}

export async function unsaveJob(jobId: string): Promise<void> {
  await api.delete(`/me/saved-jobs/${encodeURIComponent(jobId)}`);
}

export async function getSavedJobs(params: PageParams): Promise<Page<JobSummary>> {
  const { data } = await api.get<Page<JobSummary>>('/me/saved-jobs', { params });
  return data;
}

export async function getMyEngagements(state: EngagementState, params: PageParams): Promise<Page<Engagement>> {
  const { data } = await api.get<Page<Engagement>>('/me/jobs', { params: { ...params, state } });
  return data;
}
