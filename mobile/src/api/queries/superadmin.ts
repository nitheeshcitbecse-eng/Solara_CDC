import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import {
  actOnJob,
  decideModeration,
  decideReport,
  decideVerification,
  getAllJobs,
  getAuditLogs,
  getDocumentUrl,
  getModerationQueue,
  getOverview,
  getPlatformSettings,
  getReports,
  getUser,
  getUsers,
  setUserStatus,
  updatePlatformSettings,
} from '../superadmin';
import type {
  AuditLogParams,
  ModerationDecisionBody,
  ModerationListParams,
  PlatformSettingsPatch,
  ReportDecisionBody,
  ReportListParams,
  SuperJobActionBody,
  SuperJobListParams,
  UserListParams,
  UserStatusBody,
  VerificationDecisionBody,
} from '../../lib/types/superadmin';
import { nextPageParam } from './jobs';

const PAGE_SIZE = 25;

export function useOverview() {
  return useQuery({ queryKey: queryKeys.superadmin.overview(), queryFn: getOverview });
}

export function useAdminUsers(params: Omit<UserListParams, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.superadmin.users(params),
    queryFn: ({ pageParam }) => getUsers({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useAdminUser(userId: string) {
  return useQuery({ queryKey: queryKeys.superadmin.user(userId), queryFn: () => getUser(userId) });
}

/** Any owner decision changes lists, KPIs and the audit log, so refresh the superadmin cache. */
function useOwnerChanged() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.superadmin.all });
}

export function useSetUserStatus(userId: string) {
  const queryClient = useQueryClient();
  const onChanged = useOwnerChanged();
  return useMutation({
    mutationFn: (body: UserStatusBody) => setUserStatus(userId, body),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.superadmin.user(userId), user);
      onChanged();
    },
  });
}

export function useDecideVerification(userId: string) {
  const queryClient = useQueryClient();
  const onChanged = useOwnerChanged();
  return useMutation({
    mutationFn: (body: VerificationDecisionBody) => decideVerification(userId, body),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.superadmin.user(userId), user);
      onChanged();
    },
  });
}

/**
 * Short-lived signed URL for an identity document. Never cached: each view asks the
 * server for a fresh link, and the screen hides the document when it expires.
 */
export function useDocumentUrl(documentId: string) {
  return useQuery({
    queryKey: queryKeys.superadmin.document(documentId),
    queryFn: () => getDocumentUrl(documentId),
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
}

export function useAllJobs(params: Omit<SuperJobListParams, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.superadmin.jobs(params),
    queryFn: ({ pageParam }) => getAllJobs({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useActOnJob(jobId: string) {
  const queryClient = useQueryClient();
  const onChanged = useOwnerChanged();
  return useMutation({
    mutationFn: (body: SuperJobActionBody) => actOnJob(jobId, body),
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.jobs.detail(jobId), job);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sectors });
      onChanged();
    },
  });
}

export function useModerationQueue(params: Omit<ModerationListParams, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.superadmin.moderation(params),
    queryFn: ({ pageParam }) => getModerationQueue({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useDecideModeration(itemId: string) {
  const queryClient = useQueryClient();
  const onChanged = useOwnerChanged();
  return useMutation({
    mutationFn: (body: ModerationDecisionBody) => decideModeration(itemId, body),
    onSuccess: () => {
      // Approving a sector suggestion can create a new sector.
      void queryClient.invalidateQueries({ queryKey: queryKeys.sectors });
      onChanged();
    },
  });
}

export function useReports(params: Omit<ReportListParams, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.superadmin.reports(params),
    queryFn: ({ pageParam }) => getReports({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useDecideReport(reportId: string) {
  const onChanged = useOwnerChanged();
  return useMutation({ mutationFn: (body: ReportDecisionBody) => decideReport(reportId, body), onSuccess: onChanged });
}

export function useAuditLogs(params: Omit<AuditLogParams, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.superadmin.auditLogs(params),
    queryFn: ({ pageParam }) => getAuditLogs({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function usePlatformSettings() {
  return useQuery({ queryKey: queryKeys.superadmin.settings(), queryFn: getPlatformSettings });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  const onChanged = useOwnerChanged();
  return useMutation({
    mutationFn: (patch: PlatformSettingsPatch) => updatePlatformSettings(patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.superadmin.settings(), settings);
      onChanged();
    },
  });
}
