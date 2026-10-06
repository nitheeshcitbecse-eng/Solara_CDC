import { onlineManager } from '@tanstack/react-query';
import {
  create,
  isAxiosError,
  type AxiosAdapter,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';

import { i18n } from '../lib/i18n';
import type { AuthTokens, RefreshBody } from '../lib/types/auth';
import type { UploadProgressHandler } from '../lib/types/common';
import { env } from '../utils/env';
import { AppError, toAppError } from '../utils/errors';
import { mockAdapter } from './mock/adapter';
import { getRefreshToken, setRefreshToken } from '../lib/storage/secureStore';

// Per-request flags understood by our interceptors.
declare module 'axios' {
  interface AxiosRequestConfig {
    /** Auth endpoints: never attach a token and never try to refresh on 401. */
    skipAuthRefresh?: boolean;
    /** Set once a request has been replayed after a refresh, so we never loop. */
    retriedAfterRefresh?: boolean;
  }
}

export type TokenStore = {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
};

type ApiClientOptions = {
  baseURL: string;
  adapter?: AxiosAdapter;
  tokens: TokenStore;
  getLanguage: () => string;
  isOnline: () => boolean;
  /** Called when the session can't be recovered (refresh token rejected). */
  onSessionExpired: () => void;
  clientVersion: string;
  timeoutMs?: number;
};

type ApiClient = {
  http: AxiosInstance;
  /** Exposed for tests and for restoring a session at startup. */
  refreshAccessToken: () => Promise<string>;
};

/**
 * Builds the axios instance used by every API module.
 *
 * 401 handling is "single-flight": when several requests fail at once with an
 * expired access token, only ONE refresh call is made. Every failed request awaits
 * that same promise and is then replayed with the new token.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const http = create({
    baseURL: options.baseURL,
    timeout: options.timeoutMs ?? 20_000,
    adapter: options.adapter,
    headers: {
      Accept: 'application/json',
      'X-Client': 'solara-mobile',
      'X-Client-Version': options.clientVersion,
    },
  });

  let refreshPromise: Promise<string> | null = null;

  async function performRefresh(): Promise<string> {
    const refreshToken = await options.tokens.getRefreshToken();
    if (!refreshToken) throw new AppError('UNAUTHORIZED');
    const body: RefreshBody = { refreshToken };
    const response = await http.post<AuthTokens>('/auth/refresh', body, { skipAuthRefresh: true });
    // The server rotates the refresh token: the old one is now invalid, so persist the new one first.
    await options.tokens.setRefreshToken(response.data.refreshToken);
    options.tokens.setAccessToken(response.data.accessToken);
    return response.data.accessToken;
  }

  function refreshAccessToken(): Promise<string> {
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

  http.interceptors.request.use(async (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    // Mutations fail fast when offline instead of hanging until the timeout.
    if (method !== 'get' && !options.isOnline()) throw new AppError('OFFLINE');

    if (!config.skipAuthRefresh) {
      // A refresh is already running: wait for it rather than sending a token we know is stale.
      if (refreshPromise) await refreshPromise.catch(() => undefined);
      const token = options.tokens.getAccessToken();
      if (token) config.headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers.set('Accept-Language', options.getLanguage());
    return config;
  });

  http.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const original = isAxiosError(error) ? error.config : undefined;
      const isExpiredToken =
        isAxiosError(error) &&
        error.response?.status === 401 &&
        original !== undefined &&
        !original.skipAuthRefresh &&
        !original.retriedAfterRefresh;

      if (!isExpiredToken || !original) throw toAppError(error);

      try {
        await refreshAccessToken();
      } catch (refreshError) {
        const appError = toAppError(refreshError);
        // Only a rejected refresh token ends the session; a network blip during refresh does not.
        if (appError.code === 'UNAUTHORIZED' || appError.code === 'FORBIDDEN') {
          options.onSessionExpired();
          throw new AppError('UNAUTHORIZED', { status: 401 });
        }
        throw appError;
      }
      original.retriedAfterRefresh = true;
      return http.request(original);
    },
  );

  return { http, refreshAccessToken };
}

// ── Default app-wide instance ────────────────────────────────────────────────

// The access token lives only in memory: it disappears when the app is killed and
// is re-obtained from the refresh token on the next launch.
let accessToken: string | null = null;

const tokenStore: TokenStore = {
  getAccessToken: () => accessToken,
  setAccessToken: (token) => {
    accessToken = token;
  },
  getRefreshToken,
  setRefreshToken,
};

let sessionExpiredHandler: () => void = () => undefined;

/** AuthContext registers the forced sign-out here. */
export function setSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

export function setAccessToken(token: string | null): void {
  tokenStore.setAccessToken(token);
}

const client = createApiClient({
  baseURL: env.apiUrl,
  // In mock mode every request is answered in-process; nothing leaves the device.
  adapter: env.useMockApi ? mockAdapter : undefined,
  tokens: tokenStore,
  getLanguage: () => i18n.language,
  isOnline: () => onlineManager.isOnline(),
  onSessionExpired: () => sessionExpiredHandler(),
  clientVersion: Constants.expoConfig?.version ?? '0.0.0',
});

export const api = client.http;
export const refreshAccessToken = client.refreshAccessToken;

/**
 * Config for multipart uploads. React Native's FormData must reach the native
 * networking layer untouched: without the identity transformRequest, axios tries to
 * JSON-serialise it and the upload arrives empty (a well-known RN + axios issue).
 */
export function multipartConfig(onProgress?: UploadProgressHandler): AxiosRequestConfig {
  return {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data: unknown) => data,
    timeout: 120_000,
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.min(1, event.loaded / event.total));
    },
  };
}
