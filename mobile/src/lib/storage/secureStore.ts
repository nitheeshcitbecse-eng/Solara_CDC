import * as SecureStore from 'expo-secure-store';

import type { Role, SessionUser, VerificationStatus } from '../types/auth';

/**
 * Encrypted storage (iOS Keychain / Android Keystore) for the refresh token and a
 * minimal copy of the signed-in user. WHEN_UNLOCKED_THIS_DEVICE_ONLY means the values
 * are unreadable while the phone is locked and are never included in backups or
 * restored onto another device.
 *
 * Keep values small (SecureStore is meant for a few hundred bytes): never store whole
 * profiles, documents or the access token here.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const KEYS = {
  refreshToken: 'solara.refreshToken',
  sessionUser: 'solara.sessionUser',
} as const;

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.refreshToken, OPTIONS);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.refreshToken, token, OPTIONS);
}

const ROLES: readonly Role[] = ['user', 'admin', 'superadmin'];
const VERIFICATION: readonly VerificationStatus[] = ['none', 'pending', 'verified', 'rejected'];

function isSessionUser(value: unknown): value is SessionUser {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    ROLES.includes(candidate.role as Role) &&
    typeof candidate.profileComplete === 'boolean' &&
    VERIFICATION.includes(candidate.verificationStatus as VerificationStatus)
  );
}

export async function getStoredUser(): Promise<SessionUser | null> {
  const raw = await SecureStore.getItemAsync(KEYS.sessionUser, OPTIONS);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSessionUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: SessionUser): Promise<void> {
  // Only the fields the navigator needs to boot offline — nothing else.
  const minimal: SessionUser = {
    id: user.id,
    role: user.role,
    phone: user.phone,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    profileComplete: user.profileComplete,
    verificationStatus: user.verificationStatus,
  };
  await SecureStore.setItemAsync(KEYS.sessionUser, JSON.stringify(minimal), OPTIONS);
}

/** Removes every secret this app stores. Used by sign-out and forced sign-out. */
export async function clearSecureSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.refreshToken, OPTIONS),
    SecureStore.deleteItemAsync(KEYS.sessionUser, OPTIONS),
  ]);
}
