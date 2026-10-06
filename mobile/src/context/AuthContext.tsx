import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { logout as logoutRequest } from '../api/auth';
import { refreshAccessToken, setAccessToken, setSessionExpiredHandler } from '../api/client';
import { queryClient } from '../lib/queryClient';
import {
  clearSecureSession,
  getRefreshToken,
  getStoredUser,
  setRefreshToken,
  setStoredUser,
} from '../lib/storage/secureStore';
import type { AuthResponse, SessionUser } from '../lib/types/auth';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: AuthStatus;
  /** Identity + routing flags only (role, profileComplete). Profiles live in TanStack Query. */
  user: SessionUser | null;
  /** True right after a forced sign-out, so the sign-in screen can explain why. */
  sessionExpired: boolean;
};

type AuthActions = {
  completeSignIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  /** Keep routing flags in sync after profile changes (e.g. onboarding completed). */
  updateSessionUser: (user: SessionUser) => void;
};

const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);

function sameUser(a: SessionUser | null, b: SessionUser): boolean {
  return (
    a !== null &&
    a.id === b.id &&
    a.role === b.role &&
    a.name === b.name &&
    a.firstName === b.firstName &&
    a.email === b.email &&
    a.phone === b.phone &&
    a.profileComplete === b.profileComplete &&
    a.verificationStatus === b.verificationStatus
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, sessionExpired: false });

  // Persist routing flags whenever the session user object changes (sign-in or profile update).
  useEffect(() => {
    if (state.user) void setStoredUser(state.user);
  }, [state.user]);

  /** Wipes every trace of the session: memory token, secure store and cached server data. */
  const clearLocalSession = useCallback(async (expired: boolean) => {
    setAccessToken(null);
    await clearSecureSession();
    queryClient.clear();
    setState({ status: 'signedOut', user: null, sessionExpired: expired });
  }, []);

  useEffect(() => {
    // The API client calls this when a refresh token is rejected.
    setSessionExpiredHandler(() => {
      void clearLocalSession(true);
    });
  }, [clearLocalSession]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [refreshToken, storedUser] = await Promise.all([getRefreshToken(), getStoredUser()]);
      if (cancelled) return;
      if (!refreshToken || !storedUser) {
        setState({ status: 'signedOut', user: null, sessionExpired: false });
        return;
      }
      // Show the signed-in app immediately (works offline); fetch a fresh access
      // token in the background. Requests wait for this refresh automatically.
      setState({ status: 'signedIn', user: storedUser, sessionExpired: false });
      refreshAccessToken().catch(() => undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completeSignIn = useCallback(async (auth: AuthResponse) => {
    setAccessToken(auth.accessToken);
    await setRefreshToken(auth.refreshToken);
    queryClient.clear();
    // Changing state swaps the navigator's screen groups; we never navigate "home" manually.
    setState({ status: 'signedIn', user: auth.user, sessionExpired: false });
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    // Revoke on the server when possible, but never block sign-out on the network.
    if (refreshToken) logoutRequest(refreshToken).catch(() => undefined);
    await clearLocalSession(false);
  }, [clearLocalSession]);

  const updateSessionUser = useCallback((user: SessionUser) => {
    // Returning the same object when nothing changed avoids a re-render of the whole tree.
    setState((current) =>
      current.status !== 'signedIn' || sameUser(current.user, user) ? current : { ...current, user },
    );
  }, []);

  const actions = useMemo<AuthActions>(
    () => ({ completeSignIn, signOut, updateSessionUser }),
    [completeSignIn, signOut, updateSessionUser],
  );

  return (
    <AuthActionsContext.Provider value={actions}>
      <AuthStateContext.Provider value={state}>{children}</AuthStateContext.Provider>
    </AuthActionsContext.Provider>
  );
}

export function useAuth(): AuthState {
  const value = useContext(AuthStateContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function useAuthActions(): AuthActions {
  const value = useContext(AuthActionsContext);
  if (!value) throw new Error('useAuthActions must be used inside AuthProvider');
  return value;
}

/** The signed-in user. Only call from screens that are rendered for signed-in sessions. */
export function useSessionUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error('useSessionUser called without a signed-in user');
  return user;
}
