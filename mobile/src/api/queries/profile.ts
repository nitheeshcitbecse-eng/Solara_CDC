import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthActions } from '../../context/AuthContext';
import {
  getMe,
  requestAccountDeletion,
  updateHirerProfile,
  updateSeekerProfile,
  updateSettings,
  uploadAadhaar,
  type AadhaarUpload,
} from '../profile';
import { queryKeys } from '../queryKeys';
import type { UploadProgressHandler } from '../../lib/types/common';
import type { HirerProfilePatch, Me, SeekerProfilePatch, SettingsPatch } from '../../lib/types/profile';
import { deleteTempFiles } from '../../utils/files';

/** The signed-in account. `pollWhileVerifying` refreshes every 5 s while Aadhaar review is pending. */
export function useMe(pollWhileVerifying = false) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    refetchInterval: (query) => {
      const status = query.state.data?.user.verificationStatus;
      return pollWhileVerifying && status === 'pending' ? 5_000 : false;
    },
  });
}

/**
 * Keeps the session's routing flags (profileComplete, verification, name) in step
 * with the latest /me response. Mounted once inside each signed-in navigator.
 */
export function useSessionSync(): void {
  const { data } = useMe();
  const { updateSessionUser } = useAuthActions();
  useEffect(() => {
    if (data) updateSessionUser(data.user);
  }, [data, updateSessionUser]);
}

function useApplyMe() {
  const queryClient = useQueryClient();
  const { updateSessionUser } = useAuthActions();
  return (me: Me) => {
    queryClient.setQueryData(queryKeys.me, me);
    updateSessionUser(me.user);
  };
}

export function useUpdateSeekerProfile() {
  const applyMe = useApplyMe();
  return useMutation({ mutationFn: (patch: SeekerProfilePatch) => updateSeekerProfile(patch), onSuccess: applyMe });
}

export function useUpdateHirerProfile() {
  const applyMe = useApplyMe();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: HirerProfilePatch) => updateHirerProfile(patch),
    onSuccess: (me) => {
      applyMe(me);
      // The dashboard shows the hirer's name and verification banner.
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
}

export function useUploadAadhaar(onProgress?: UploadProgressHandler) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AadhaarUpload) => uploadAadhaar(input, onProgress),
    onSuccess: (aadhaar, input) => {
      deleteTempFiles([input.front.uri, ...(input.back ? [input.back.uri] : [])]);
      queryClient.setQueryData<Me>(queryKeys.me, (current) => {
        if (!current) return current;
        if (current.seeker) return { ...current, seeker: { ...current.seeker, aadhaar } };
        if (current.hirer) return { ...current, hirer: { ...current.hirer, aadhaar } };
        return current;
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => updateSettings(patch),
    // Optimistic: switches flip instantly and roll back if the server rejects the change.
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me });
      const previous = queryClient.getQueryData<Me>(queryKeys.me);
      queryClient.setQueryData<Me>(queryKeys.me, (current) =>
        current
          ? {
              ...current,
              settings: {
                language: patch.language ?? current.settings.language,
                notifications: { ...current.settings.notifications, ...patch.notifications },
                privacy: { ...current.settings.privacy, ...patch.privacy },
              },
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.me, context.previous);
    },
    onSuccess: (settings) => {
      queryClient.setQueryData<Me>(queryKeys.me, (current) => (current ? { ...current, settings } : current));
    },
  });
}

export function useRequestAccountDeletion() {
  return useMutation({ mutationFn: requestAccountDeletion });
}
