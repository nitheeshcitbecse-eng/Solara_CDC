import { isLanguageCode } from '../../../lib/i18n/languages';
import type { AuthResponse, AuthTokens, SignUpRole } from '../../../lib/types/auth';
import { newId, nowIso, type DbUser, type MockDb } from '../db';
import { audit } from '../events';
import { defaultSettings, emptyHirerProfile, emptySeekerProfile } from '../fixtures/users';
import { accepted, fail, noContent, ok, readEnum, readString, route, type MockRequest, type Route } from '../http';
import { toSessionUser } from '../serializers';

/** Demo values documented in the README. */
export const MOCK_OTP = '123456';
export const MOCK_TOTP = '123456';
const RATE_LIMITED_PHONE = '+919000000000';
const ACCESS_TTL_MS = 15 * 60_000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000;
const MFA_TTL_MS = 5 * 60_000;
const MAX_OTP_ATTEMPTS = 5;

const E164_INDIA = /^\+91[6-9]\d{9}$/;
const SIGN_UP_ROLES: readonly SignUpRole[] = ['user', 'admin'];

function issueTokens(db: MockDb, userId: string, familyId: string = newId('fam')): AuthTokens {
  const now = Date.now();
  const accessToken = newId('at');
  const refreshToken = newId('rt');
  db.auth.accessTokens[accessToken] = { userId, expiresAt: now + ACCESS_TTL_MS };
  db.auth.refreshTokens[refreshToken] = { userId, familyId, revoked: false, expiresAt: now + REFRESH_TTL_MS };
  return { accessToken, refreshToken };
}

function revokeFamily(db: MockDb, familyId: string): void {
  for (const session of Object.values(db.auth.refreshTokens)) {
    if (session.familyId === familyId) session.revoked = true;
  }
}

function assertCanSignIn(user: DbUser): void {
  if (user.status !== 'active') throw fail.forbidden('ACCOUNT_SUSPENDED');
}

function createAccount(db: MockDb, request: MockRequest, role: SignUpRole, identity: { phone?: string; email?: string }): DbUser {
  const language = isLanguageCode(request.language) ? request.language : 'en';
  const user: DbUser = {
    id: newId('usr'),
    role,
    phone: identity.phone ?? null,
    email: identity.email ?? null,
    password: null,
    name: null,
    status: 'active',
    statusReason: null,
    createdAt: nowIso(),
    profileComplete: false,
    seeker: role === 'user' ? emptySeekerProfile() : null,
    hirer: role === 'admin' ? emptyHirerProfile() : null,
    settings: defaultSettings(language),
    deletionRequestedAt: null,
    savedJobIds: [],
  };
  db.users.push(user);
  return user;
}

function signInResponse(db: MockDb, user: DbUser): AuthResponse {
  assertCanSignIn(user);
  // Signing in again cancels a pending account deletion (docs/API.md §4).
  user.deletionRequestedAt = null;
  return { ...issueTokens(db, user.id), user: toSessionUser(user) };
}

export const authRoutes: Route[] = [
  route('POST', '/auth/otp/request', 'public', ({ body, db }) => {
    const phone = readString(body, 'phone', { pattern: E164_INDIA });
    const role = readEnum(body, 'role', SIGN_UP_ROLES);
    const { otp } = db.settings;

    if (phone === RATE_LIMITED_PHONE) throw fail.rateLimited(60);

    const now = Date.now();
    const recent = (db.auth.otpHistory[phone] ?? []).filter((at) => now - at < 60 * 60_000);
    if (recent.length >= otp.maxRequestsPerHour) {
      const oldest = Math.min(...recent);
      throw fail.rateLimited(Math.ceil((oldest + 60 * 60_000 - now) / 1000));
    }

    const existing = db.users.find((user) => user.phone === phone);
    if (existing && existing.role !== role) throw fail.conflict('ROLE_MISMATCH');

    db.auth.otpHistory[phone] = [...recent, now];
    const requestId = newId('otp');
    db.auth.otpRequests[requestId] = { phone, role, expiresAt: now + otp.expirySec * 1000, attempts: 0 };
    return accepted({ requestId, expiresInSec: otp.expirySec, resendAfterSec: otp.resendAfterSec });
  }),

  route('POST', '/auth/otp/verify', 'public', (request) => {
    const { body, db } = request;
    const requestId = readString(body, 'requestId');
    const phone = readString(body, 'phone', { pattern: E164_INDIA });
    const code = readString(body, 'code', { pattern: /^\d{6}$/ });

    const pending = db.auth.otpRequests[requestId];
    if (!pending || pending.phone !== phone || pending.expiresAt < Date.now()) throw fail.otpExpired();
    pending.attempts += 1;
    if (pending.attempts > MAX_OTP_ATTEMPTS) {
      delete db.auth.otpRequests[requestId];
      throw fail.otpExpired();
    }
    if (code !== MOCK_OTP) throw fail.otpInvalid();
    delete db.auth.otpRequests[requestId];

    const user = db.users.find((candidate) => candidate.phone === phone) ?? createAccount(db, request, pending.role, { phone });
    return ok(signInResponse(db, user));
  }),

  route('POST', '/auth/google', 'public', (request) => {
    const { body, db } = request;
    readString(body, 'idToken', { min: 10 });
    const role = readEnum(body, 'role', SIGN_UP_ROLES);
    // The mock can't verify Google tokens, so each role maps to one demo Google account.
    const email = role === 'user' ? 'google.seeker@example.com' : 'google.hirer@example.com';
    const existing = db.users.find((candidate) => candidate.email === email);
    if (existing && existing.role !== role) throw fail.conflict('ROLE_MISMATCH');
    const user = existing ?? createAccount(db, request, role, { email });
    return ok(signInResponse(db, user));
  }),

  route('POST', '/auth/refresh', 'public', ({ body, db }) => {
    const refreshToken = readString(body, 'refreshToken');
    const session = db.auth.refreshTokens[refreshToken];
    if (!session || session.expiresAt < Date.now()) throw fail.unauthorized('Invalid refresh token');
    if (session.revoked) {
      // Re-use of a rotated token means it may have been stolen: end the whole session family.
      revokeFamily(db, session.familyId);
      throw fail.unauthorized('Refresh token reuse detected');
    }
    const user = db.users.find((candidate) => candidate.id === session.userId);
    if (!user || user.status !== 'active') throw fail.unauthorized('Account unavailable');
    session.revoked = true;
    return ok(issueTokens(db, session.userId, session.familyId));
  }),

  route('POST', '/auth/logout', 'public', ({ body, db }) => {
    const refreshToken = readString(body, 'refreshToken', { optional: true });
    const session = refreshToken ? db.auth.refreshTokens[refreshToken] : undefined;
    if (session) revokeFamily(db, session.familyId);
    return noContent();
  }),

  route('POST', '/superadmin/auth/login', 'public', ({ body, db }) => {
    const email = readString(body, 'email', { max: 120 }).toLowerCase();
    const password = readString(body, 'password', { max: 128 });
    const owner = db.users.find((user) => user.role === 'superadmin' && user.email === email);
    if (!owner || owner.password !== password) {
      throw fail.unauthorized('Invalid credentials');
    }
    const mfaToken = newId('mfa');
    db.auth.mfaTokens[mfaToken] = { userId: owner.id, expiresAt: Date.now() + MFA_TTL_MS };
    return ok({ mfaToken });
  }),

  route('POST', '/superadmin/auth/totp', 'public', ({ body, db }) => {
    const mfaToken = readString(body, 'mfaToken');
    const code = readString(body, 'code', { pattern: /^\d{6}$/ });
    const pending = db.auth.mfaTokens[mfaToken];
    if (!pending || pending.expiresAt < Date.now()) throw fail.otpExpired();
    if (code !== MOCK_TOTP) throw fail.otpInvalid();
    delete db.auth.mfaTokens[mfaToken];
    const owner = db.users.find((user) => user.id === pending.userId);
    if (!owner) throw fail.unauthorized();
    audit(db, owner.id, 'auth.login', { type: 'session', id: owner.id, label: owner.name ?? '' });
    return ok({ ...issueTokens(db, owner.id), user: toSessionUser(owner) });
  }),
];
