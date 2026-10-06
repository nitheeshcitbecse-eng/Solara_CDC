import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { shouldRetryQuery } from '../utils/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry only NETWORK / TIMEOUT / SERVER failures, at most twice. 4xx errors never retry.
      retry: shouldRetryQuery,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: false,
      // 'always' lets the mutation run while offline so our API client can fail it
      // immediately with OFFLINE, instead of silently pausing until reconnect.
      networkMode: 'always',
    },
  },
});

/** Wires TanStack Query to device connectivity and app foreground state. Call once at startup. */
export function setupQueryManagers(): () => void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // isInternetReachable is null while unknown; only treat an explicit false as offline.
      setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    }),
  );

  // React Native has no window focus; refetch stale queries when the app returns to the foreground.
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
  return () => subscription.remove();
}
