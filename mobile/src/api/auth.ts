import type {
  AuthResponse,
  GoogleSignInBody,
  LogoutBody,
  OtpRequestBody,
  OtpRequestResponse,
  OtpVerifyBody,
  SuperAdminLoginBody,
  SuperAdminLoginResponse,
  SuperAdminTotpBody,
} from '../lib/types/auth';
import { api } from './client';

// Auth endpoints never carry an access token and must not trigger the refresh flow.
const AUTH = { skipAuthRefresh: true } as const;

export async function requestOtp(body: OtpRequestBody): Promise<OtpRequestResponse> {
  const { data } = await api.post<OtpRequestResponse>('/auth/otp/request', body, AUTH);
  return data;
}

export async function verifyOtp(body: OtpVerifyBody): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/otp/verify', body, AUTH);
  return data;
}

export async function signInWithGoogleToken(body: GoogleSignInBody): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/google', body, AUTH);
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  const body: LogoutBody = { refreshToken };
  await api.post('/auth/logout', body, AUTH);
}

export async function superAdminLogin(body: SuperAdminLoginBody): Promise<SuperAdminLoginResponse> {
  const { data } = await api.post<SuperAdminLoginResponse>('/superadmin/auth/login', body, AUTH);
  return data;
}

export async function superAdminTotp(body: SuperAdminTotpBody): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/superadmin/auth/totp', body, AUTH);
  return data;
}
