import type { LocalFile, UploadProgressHandler } from '../lib/types/common';
import type {
  AadhaarInfo,
  DeleteAccountResponse,
  HirerProfilePatch,
  Me,
  SeekerProfilePatch,
  Settings,
  SettingsPatch,
} from '../lib/types/profile';
import { api, multipartConfig } from './client';

export async function getMe(): Promise<Me> {
  const { data } = await api.get<Me>('/me');
  return data;
}

export async function updateSeekerProfile(patch: SeekerProfilePatch): Promise<Me> {
  const { data } = await api.patch<Me>('/me/profile', patch);
  return data;
}

export async function updateHirerProfile(patch: HirerProfilePatch): Promise<Me> {
  const { data } = await api.patch<Me>('/admin/profile', patch);
  return data;
}

export type AadhaarUpload = { front: LocalFile; back: LocalFile | null; last4: string };

export async function uploadAadhaar(input: AadhaarUpload, onProgress?: UploadProgressHandler): Promise<AadhaarInfo> {
  // React Native's FormData accepts { uri, name, type } objects for files.
  const form = new FormData();
  form.append('front', { uri: input.front.uri, name: input.front.name, type: input.front.mimeType });
  if (input.back) form.append('back', { uri: input.back.uri, name: input.back.name, type: input.back.mimeType });
  form.append('last4', input.last4);
  const { data } = await api.post<AadhaarInfo>('/me/aadhaar', form, multipartConfig(onProgress));
  return data;
}

export async function updateSettings(patch: SettingsPatch): Promise<Settings> {
  const { data } = await api.patch<Settings>('/me/settings', patch);
  return data;
}

export async function requestAccountDeletion(): Promise<DeleteAccountResponse> {
  const { data } = await api.delete<DeleteAccountResponse>('/me');
  return data;
}
