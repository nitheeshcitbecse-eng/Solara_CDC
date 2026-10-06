import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getJob, getMyEngagements, getSavedJobs, saveJob, searchJobs, unsaveJob } from '../jobs';
import { queryKeys } from '../queryKeys';
import type { Page } from '../../lib/types/common';
import type { EngagementState, JobDetail, JobSearchParams, JobSummary } from '../../lib/types/jobs';

const PAGE_SIZE = 20;

/** Standard page-number pagination for every `Page<T>` endpoint. */
export function nextPageParam<T>(last: Page<T>): number | undefined {
  return last.page * last.limit < last.total ? last.page + 1 : undefined;
}

/** Flattens infinite-query pages (numbered or cursor-based) into one array for FlatList. */
export function useFlatPages<T>(data: InfiniteData<{ items: T[] }> | undefined): T[] {
  return useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
}

export function useJobSearch(params: Omit<JobSearchParams, 'page' | 'limit'>, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.list(params),
    queryFn: ({ pageParam }) => searchJobs({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled,
  });
}

/** Total active jobs matching a filter — used for counts like "12 jobs in Chennai". */
export function useJobCount(params: Omit<JobSearchParams, 'page' | 'limit'>, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.jobs.list(params), 'count'] as const,
    queryFn: () => searchJobs({ ...params, page: 1, limit: 1 }),
    select: (page) => page.total,
    enabled,
  });
}

export function useJob(jobId: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.jobs.detail(jobId), queryFn: () => getJob(jobId), enabled: enabled && jobId !== '' });
}

export function useSavedJobs() {
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.saved(),
    queryFn: ({ pageParam }) => getSavedJobs({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useEngagements(state: EngagementState) {
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.engagements(state),
    queryFn: ({ pageParam }) => getMyEngagements(state, { page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

// ── Optimistic save / unsave ─────────────────────────────────────────────────

type JobCache = InfiniteData<Page<JobSummary>> | JobDetail | JobSummary[] | undefined;

function isInfinitePages(value: unknown): value is InfiniteData<Page<JobSummary>> {
  return typeof value === 'object' && value !== null && 'pages' in value && Array.isArray(value.pages);
}

function isJob(value: unknown): value is JobDetail {
  return typeof value === 'object' && value !== null && 'id' in value && 'saved' in value;
}

/** Applies `patch` to job `jobId` in every cached jobs list and detail. */
function patchJobEverywhere(queryClient: QueryClient, jobId: string, patch: Partial<JobSummary>): void {
  queryClient.setQueriesData<JobCache>({ queryKey: queryKeys.jobs.all }, (current) => {
    if (isInfinitePages(current)) {
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
        })),
      };
    }
    if (isJob(current) && current.id === jobId) return { ...current, ...patch };
    return current;
  });
}

export function useToggleSaveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, save }: { jobId: string; save: boolean }) => (save ? saveJob(jobId) : unsaveJob(jobId)),
    onMutate: async ({ jobId, save }) => {
      // Stop in-flight fetches from overwriting the optimistic value, then snapshot for rollback.
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.all });
      const snapshot = queryClient.getQueriesData<JobCache>({ queryKey: queryKeys.jobs.all });
      patchJobEverywhere(queryClient, jobId, { saved: save });
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSettled: () => {
      // Only the saved list changes membership; other lists already show the right flag.
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.saved() });
    },
  });
}
