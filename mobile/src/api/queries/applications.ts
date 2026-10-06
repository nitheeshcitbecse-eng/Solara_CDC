import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  applyToJob,
  decideApplication,
  getApplicant,
  getJobApplicants,
  getMyApplication,
  getMyApplications,
  openApplicationConversation,
} from '../applications';
import { queryKeys } from '../queryKeys';
import type { ApplicationStatus, ApplyInput, HirerDecision } from '../../lib/types/applications';
import type { UploadProgressHandler } from '../../lib/types/common';
import { deleteTempFiles } from '../../utils/files';
import { nextPageParam } from './jobs';

const PAGE_SIZE = 20;

export function useMyApplications(status?: ApplicationStatus) {
  return useInfiniteQuery({
    queryKey: queryKeys.applications.mine(status),
    queryFn: ({ pageParam }) => getMyApplications({ status, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useMyApplication(applicationId: string) {
  return useQuery({ queryKey: queryKeys.applications.detail(applicationId), queryFn: () => getMyApplication(applicationId) });
}

export function useApplyToJob(jobId: string, onProgress?: UploadProgressHandler) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyInput) => applyToJob(jobId, input, onProgress),
    onSuccess: (application, input) => {
      // The recording now lives on the server; remove our temp copy.
      deleteTempFiles([input.voiceIntro.uri]);
      queryClient.setQueryData(queryKeys.applications.detail(application.id), application);
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      // The job now shows "applied" in lists and details.
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
  });
}

export function useOpenConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => openApplicationConversation(applicationId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() }),
  });
}

// ── Hirer side ───────────────────────────────────────────────────────────────

export function useJobApplicants(jobId: string, status?: ApplicationStatus) {
  return useInfiniteQuery({
    queryKey: queryKeys.admin.applicants(jobId, status),
    queryFn: ({ pageParam }) => getJobApplicants(jobId, { status, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useApplicant(applicationId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.admin.applicant(applicationId),
    queryFn: async () => {
      const applicant = await getApplicant(applicationId);
      // Opening an applicant marks them as seen, which changes the dashboard's "new" count.
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
      return applicant;
    },
  });
}

export function useDecideApplication(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: HirerDecision) => decideApplication(applicationId, status),
    onSuccess: (applicant) => {
      queryClient.setQueryData(queryKeys.admin.applicant(applicationId), applicant);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.applicantsForJob(applicant.jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
}
