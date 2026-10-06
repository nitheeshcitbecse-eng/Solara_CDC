import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import { AppError } from '../../utils/errors';
import { createApiClient, type TokenStore } from '../client';

function response(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  return { data, status, statusText: String(status), headers: new AxiosHeaders(), config, request: {} };
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError(
    'Unauthorized',
    AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    response(config, 401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }),
  );
}

function setup(options: { refreshSucceeds?: boolean; online?: boolean } = {}) {
  const { refreshSucceeds = true, online = true } = options;
  let accessToken: string | null = 'stale';
  let refreshToken = 'refresh-1';
  const calls = { refresh: 0, requests: 0 };

  const tokens: TokenStore = {
    getAccessToken: () => accessToken,
    setAccessToken: (token) => {
      accessToken = token;
    },
    getRefreshToken: async () => refreshToken,
    setRefreshToken: async (token) => {
      refreshToken = token;
    },
  };

  const adapter: AxiosAdapter = async (config) => {
    if (config.url === '/auth/refresh') {
      calls.refresh += 1;
      // Slow refresh, so concurrent 401s pile up behind the same promise.
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (!refreshSucceeds) throw unauthorized(config);
      return response(config, 200, { accessToken: 'fresh', refreshToken: 'refresh-2' });
    }
    calls.requests += 1;
    const auth = AxiosHeaders.from(config.headers).get('Authorization');
    if (auth !== 'Bearer fresh') throw unauthorized(config);
    return response(config, 200, { ok: true, url: config.url });
  };

  const onSessionExpired = jest.fn();
  const client = createApiClient({
    baseURL: 'http://test/api/v1',
    adapter,
    tokens,
    getLanguage: () => 'ta',
    isOnline: () => online,
    onSessionExpired,
    clientVersion: '1.0.0',
  });
  return { client, calls, onSessionExpired, getTokens: () => ({ accessToken, refreshToken }) };
}

describe('createApiClient', () => {
  it('refreshes only once for concurrent 401s and replays every request', async () => {
    const { client, calls, getTokens } = setup();
    const results = await Promise.all([client.http.get('/a'), client.http.get('/b'), client.http.get('/c')]);

    expect(results.map((result) => result.data.url)).toEqual(['/a', '/b', '/c']);
    expect(calls.refresh).toBe(1);
    expect(getTokens()).toEqual({ accessToken: 'fresh', refreshToken: 'refresh-2' });
  });

  it('signs out once and rejects with UNAUTHORIZED when the refresh token is rejected', async () => {
    const { client, onSessionExpired } = setup({ refreshSucceeds: false });
    const outcomes = await Promise.allSettled([client.http.get('/a'), client.http.get('/b')]);

    for (const outcome of outcomes) {
      expect(outcome.status).toBe('rejected');
      if (outcome.status === 'rejected') expect((outcome.reason as AppError).code).toBe('UNAUTHORIZED');
    }
    expect(onSessionExpired).toHaveBeenCalled();
  });

  it('fails mutations immediately when offline', async () => {
    const { client, calls } = setup({ online: false });
    await expect(client.http.post('/jobs/1/applications', {})).rejects.toMatchObject({ code: 'OFFLINE' });
    expect(calls.requests).toBe(0);
  });

  it('never refreshes for auth endpoints', async () => {
    const { client, calls } = setup();
    await expect(client.http.post('/auth/otp/verify', {}, { skipAuthRefresh: true })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(calls.refresh).toBe(0);
  });

  it('sends the language and client headers', async () => {
    let seen: Record<string, unknown> = {};
    const client = createApiClient({
      baseURL: 'http://test',
      adapter: async (config) => {
        seen = AxiosHeaders.from(config.headers).toJSON();
        return response(config, 200, {});
      },
      tokens: {
        getAccessToken: () => 'token',
        setAccessToken: () => undefined,
        getRefreshToken: async () => null,
        setRefreshToken: async () => undefined,
      },
      getLanguage: () => 'hi',
      isOnline: () => true,
      onSessionExpired: () => undefined,
      clientVersion: '2.3.4',
    });
    await client.http.get('/me');
    expect(seen).toMatchObject({
      Authorization: 'Bearer token',
      'Accept-Language': 'hi',
      'X-Client': 'solara-mobile',
      'X-Client-Version': '2.3.4',
    });
  });
});
