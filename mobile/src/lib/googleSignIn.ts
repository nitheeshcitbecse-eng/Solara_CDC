import Constants, { ExecutionEnvironment } from 'expo-constants';

import { env } from '../utils/env';
import { AppError } from '../utils/errors';

/**
 * Google Sign-In needs native code that Expo Go doesn't contain, so it only runs in
 * a development/production build with EXPO_PUBLIC_ENABLE_GOOGLE_SIGNIN=true.
 * Otherwise (Expo Go, or the flag off) the mock API accepts a demo token, so the
 * button still works end-to-end while developing.
 */
type GoogleSignInMode = 'native' | 'mock' | 'unavailable';

const MOCK_ID_TOKEN = 'mock-google-id-token';

export function googleSignInMode(): GoogleSignInMode {
  const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (env.enableGoogleSignIn && !inExpoGo && env.googleWebClientId) return 'native';
  // Without native Google, only the mock can accept a sign-in; the real API would reject it.
  return env.useMockApi ? 'mock' : 'unavailable';
}

let configured = false;

/** Returns a Google ID token, or null if the user cancelled the Google sheet. */
export async function getGoogleIdToken(): Promise<string | null> {
  const mode = googleSignInMode();
  if (mode === 'mock') return MOCK_ID_TOKEN;
  if (mode === 'unavailable') throw new AppError('FORBIDDEN');

  // Imported lazily: the module throws on load when its native half is missing,
  // so it must never be evaluated in Expo Go.
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  if (!configured) {
    GoogleSignin.configure({ webClientId: env.googleWebClientId ?? undefined });
    configured = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  if (!response.data.idToken) throw new AppError('UNAUTHORIZED');
  return response.data.idToken;
}
