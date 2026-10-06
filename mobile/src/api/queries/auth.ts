import { useMutation } from '@tanstack/react-query';

import {
  requestOtp,
  signInWithGoogleToken,
  superAdminLogin,
  superAdminTotp,
  verifyOtp,
} from '../auth';
import { getGoogleIdToken } from '../../lib/googleSignIn';
import type { AuthResponse, OtpVerifyBody, SignUpRole, SuperAdminLoginBody, SuperAdminTotpBody } from '../../lib/types/auth';
import { toE164 } from '../../utils/format';

export function useRequestOtp() {
  return useMutation({
    mutationFn: ({ phone, role }: { phone: string; role: SignUpRole }) => requestOtp({ phone: toE164(phone), role }),
  });
}

export function useVerifyOtp() {
  return useMutation({ mutationFn: (body: OtpVerifyBody) => verifyOtp(body) });
}

/** Resolves null when the user closes the Google sheet without choosing an account. */
export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async (role: SignUpRole): Promise<AuthResponse | null> => {
      const idToken = await getGoogleIdToken();
      if (!idToken) return null;
      return signInWithGoogleToken({ idToken, role });
    },
  });
}

export function useSuperAdminLogin() {
  return useMutation({
    mutationFn: (body: SuperAdminLoginBody) =>
      superAdminLogin({ email: body.email.trim().toLowerCase(), password: body.password }),
  });
}

export function useSuperAdminTotp() {
  return useMutation({ mutationFn: (body: SuperAdminTotpBody) => superAdminTotp(body) });
}
