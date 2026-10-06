import Constants, { ExecutionEnvironment } from 'expo-constants';

import { env } from '../utils/env';

/**
 * Remote push registration — a stub until the backend exposes a device-token endpoint.
 *
 * Expo Go can no longer receive remote push, so real registration needs a development
 * build plus `expo-notifications` and an EAS project id. Until then everything the user
 * needs is delivered by the in-app Notifications screen (GET /notifications).
 */
type PushStatus =
  | { state: 'disabled' } // EXPO_PUBLIC_ENABLE_PUSH=false
  | { state: 'unavailable'; reason: 'expo-go' | 'not-configured' };

export function getPushStatus(): PushStatus {
  if (!env.enablePush) return { state: 'disabled' };
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return { state: 'unavailable', reason: 'expo-go' };
  return { state: 'unavailable', reason: 'not-configured' };
}
