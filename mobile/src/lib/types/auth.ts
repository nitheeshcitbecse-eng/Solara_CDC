export type Role = 'user' | 'admin' | 'superadmin';
export type SignUpRole = Exclude<Role, 'superadmin'>;
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export type SessionUser = {
  id: string;
  role: Role;
  phone: string | null;
  email: string | null;
  name: string | null;
  firstName: string | null;
  profileComplete: boolean;
  verificationStatus: VerificationStatus;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = AuthTokens & { user: SessionUser };

export type OtpRequestBody = { phone: string; role: SignUpRole };
export type OtpRequestResponse = { requestId: string; expiresInSec: number; resendAfterSec: number };
export type OtpVerifyBody = { requestId: string; phone: string; code: string };
export type GoogleSignInBody = { idToken: string; role: SignUpRole };
export type RefreshBody = { refreshToken: string };
export type LogoutBody = { refreshToken: string };

export type SuperAdminLoginBody = { email: string; password: string };
export type SuperAdminLoginResponse = { mfaToken: string };
export type SuperAdminTotpBody = { mfaToken: string; code: string };
