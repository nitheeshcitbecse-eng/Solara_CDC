import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  closeJob,
  createJob,
  getAdminDashboard,
  getJobAnalysis,
  getMyPostedJobs,
  submitJob,
  updateJob,
  uploadJobPhotos,
} from '../admin';
import { queryKeys } from '../queryKeys';
import type { LocalFile, UploadProgressHandler } from '../../lib/types/common';
import type { AdminJobState, JobDetail, JobInput } from '../../lib/types/jobs';
import { deleteTempFiles } from '../../utils/files';
import { nextPageParam } from './jobs';

const ANALYSIS_POLL_MS = 1_500;

export function useAdminDashboard() {
  return useQuery({ queryKey: queryKeys.admin.dashboard(), queryFn: getAdminDashboard });
}

export function useMyPostedJobs(state: AdminJobState) {
  return useInfiniteQuery({
    queryKey: queryKeys.admin.jobs(state),
    queryFn: ({ pageParam }) => getMyPostedJobs(state, { page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

/** After any change to a posted job, refresh the hirer's job lists, the dashboard and the job itself. */
function useJobChanged() {
  const queryClient = useQueryClient();
  return (job: JobDetail) => {
    queryClient.setQueryData(queryKeys.jobs.detail(job.id), job);
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sectors });
  };
}

export function useCreateJob() {
  const onChanged = useJobChanged();
  return useMutation({ mutationFn: (input: JobInput) => createJob(input), onSuccess: onChanged });
}

export function useUpdateJob(jobId: string) {
  const onChanged = useJobChanged();
  return useMutation({ mutationFn: (patch: Partial<JobInput>) => updateJob(jobId, patch), onSuccess: onChanged });
}

export function useUploadJobPhotos(onProgress?: UploadProgressHandler) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, photos, note }: { jobId: string; photos: LocalFile[]; note: string }) =>
      uploadJobPhotos(jobId, photos, note, onProgress),
    onSuccess: (_result, { jobId, photos }) => {
      // The server keeps its own copies; drop our resized temp files.
      deleteTempFiles(photos.map((photo) => photo.uri));
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.analysis(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
    },
  });
}

/** Polls the AI photo analysis every 1.5 s until it is complete. */
export function useJobAnalysis(jobId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.analysis(jobId ?? 'none'),
    queryFn: () => getJobAnalysis(jobId ?? ''),
    enabled: enabled && jobId !== null,
    refetchInterval: (query) => (query.state.data?.status === 'complete' ? false : ANALYSIS_POLL_MS),
  });
}

export function useSubmitJob() {
  const onChanged = useJobChanged();
  return useMutation({ mutationFn: (jobId: string) => submitJob(jobId), onSuccess: onChanged });
}

export function useCloseJob() {
  const onChanged = useJobChanged();
  return useMutation({ mutationFn: (jobId: string) => closeJob(jobId), onSuccess: onChanged });
}
