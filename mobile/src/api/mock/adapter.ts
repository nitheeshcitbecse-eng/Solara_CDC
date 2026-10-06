import { onlineManager } from '@tanstack/react-query';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import type { ApiErrorBody } from '../../lib/types/common';
import { getDb, persistDb, type DbUser, type MockDb } from './db';
import { loadMockMedia, resolveMediaRefs } from './fixtures/media';
import { fail, isPlainObject, matchRoute, MockHttpError, type MockFile, type MockForm, type Route } from './http';
import { adminRoutes } from './routes/admin';
import { applicationRoutes } from './routes/applications';
import { authRoutes } from './routes/auth';
import { jobRoutes } from './routes/jobs';
import { messageRoutes } from './routes/messages';
import { profileRoutes } from './routes/profile';
import { superadminRoutes } from './routes/superadmin';
import { supportRoutes } from './routes/support';
import { totalUploadBytes } from './uploads';

/**
 * An axios adapter that answers every endpoint in docs/API.md in-process.
 * Swapping to the real backend only means not installing this adapter
 * (EXPO_PUBLIC_USE_MOCK_API=false); the rest of the app is unaware of it.
 */

const routes: Route[] = [
  ...authRoutes,
  ...profileRoutes,
  ...jobRoutes,
  ...adminRoutes,
  ...applicationRoutes,
  ...messageRoutes,
  ...supportRoutes,
  ...superadminRoutes,
];

const API_PREFIX = '/api/v1';

// Realistic network latency (400–900 ms) so loading states are visible while developing.
const latency = { min: 400, max: 900 };

/** Tests set this to zero so integration tests run fast; the app never changes it. */
export function setMockLatency(min: number, max: number): void {
  latency.min = min;
  latency.max = max;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const randomLatency = () => latency.min + Math.random() * (latency.max - latency.min);

function parseUrl(config: InternalAxiosRequestConfig): { path: string; query: Record<string, string> } {
  let url = config.url ?? '';
  if (config.baseURL && url.startsWith(config.baseURL)) url = url.slice(config.baseURL.length);
  url = url.replace(/^https?:\/\/[^/]+/, '');
  if (url.startsWith(API_PREFIX)) url = url.slice(API_PREFIX.length);

  const [pathPart = '', queryPart = ''] = url.split('?');
  const query: Record<string, string> = {};
  for (const pair of queryPart.split('&').filter(Boolean)) {
    const [key = '', value = ''] = pair.split('=');
    query[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  if (isPlainObject(config.params)) {
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null && value !== '') query[key] = String(value);
    }
  }
  return { path: pathPart.startsWith('/') ? pathPart : `/${pathPart}`, query };
}

function parseJsonBody(data: unknown): Record<string, unknown> {
  if (typeof data === 'string' && data.length > 0) {
    try {
      const parsed: unknown = JSON.parse(data);
      return isPlainObject(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isPlainObject(data) ? data : {};
}

type FormPart = { fieldName?: unknown; string?: unknown; uri?: unknown; name?: unknown; type?: unknown };

/** Reads React Native's FormData (which exposes its parts) into fields and files. */
function readForm(data: unknown): MockForm | null {
  if (!data || typeof data !== 'object' || !('getParts' in data) || typeof data.getParts !== 'function') return null;
  const parts = (data.getParts as () => unknown[])();
  const form: MockForm = { fields: {}, files: {} };
  for (const raw of parts) {
    const part = raw as FormPart;
    if (typeof part.fieldName !== 'string') continue;
    if (typeof part.uri === 'string') {
      const file: MockFile = {
        uri: part.uri,
        name: typeof part.name === 'string' ? part.name : 'upload',
        type: typeof part.type === 'string' ? part.type : 'application/octet-stream',
      };
      (form.files[part.fieldName] ??= []).push(file);
    } else if (typeof part.string === 'string') {
      (form.fields[part.fieldName] ??= []).push(part.string);
    }
  }
  return form;
}

function authenticate(db: MockDb, config: InternalAxiosRequestConfig, access: Route['access']): DbUser | null {
  if (access === 'public') return null;
  const header = AxiosHeaders.from(config.headers).get('Authorization');
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '';
  const session = token ? db.auth.accessTokens[token] : undefined;
  if (!session || session.expiresAt < Date.now()) throw fail.unauthorized('Access token expired');
  const user = db.users.find((candidate) => candidate.id === session.userId);
  if (!user) throw fail.unauthorized();
  if (user.status !== 'active') throw fail.forbidden('ACCOUNT_SUSPENDED');
  if (access !== 'any' && !access.includes(user.role)) throw fail.forbidden('ROLE');
  return user;
}

function buildResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): AxiosResponse {
  return {
    data,
    status,
    statusText: String(status),
    headers: new AxiosHeaders({ 'content-type': 'application/json', ...headers }),
    config,
    request: {},
  };
}

async function simulateLatency(config: InternalAxiosRequestConfig, form: MockForm | null, totalBytes: number): Promise<void> {
  const latency = randomLatency();
  if (!form || !config.onUploadProgress) return delay(latency);
  // Uploads take a little longer and report progress in steps, like a real network.
  const steps = 8;
  const total = Math.max(totalBytes, 1);
  for (let step = 1; step <= steps; step += 1) {
    await delay((latency * 2) / steps);
    const loaded = Math.round((total * step) / steps);
    config.onUploadProgress({ loaded, total, progress: loaded / total, bytes: total / steps, lengthComputable: true, upload: true });
  }
}

function toAxiosError(config: InternalAxiosRequestConfig, error: MockHttpError): AxiosError {
  const body: ApiErrorBody = { error: { code: error.code, message: error.message, details: error.details } };
  const retryAfter = error.details?.retryAfter;
  const headers: Record<string, string> = typeof retryAfter === 'number' ? { 'retry-after': String(retryAfter) } : {};
  const response = buildResponse(config, error.status, body, headers);
  const code = error.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST;
  return new AxiosError(error.message, code, config, {}, response);
}

export const mockAdapter: AxiosAdapter = async (config) => {
  const [db] = await Promise.all([getDb(), loadMockMedia()]);
  const method = (config.method ?? 'get').toUpperCase();
  const { path, query } = parseUrl(config);
  const form = readForm(config.data);
  const totalBytes = form ? totalUploadBytes(Object.values(form.files).flat()) : 0;

  await simulateLatency(config, form, totalBytes);

  // Behave like a real network: nothing reaches the "server" while offline.
  if (!onlineManager.isOnline()) {
    throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {});
  }

  try {
    const match = matchRoute(routes, method, path);
    if (!match) throw fail.notFound();
    const user = authenticate(db, config, match.route.access);
    const language = AxiosHeaders.from(config.headers).get('Accept-Language');
    const result = await match.route.handler({
      method,
      path,
      params: match.params,
      query,
      body: form ? {} : parseJsonBody(config.data),
      form,
      user,
      db,
      language: typeof language === 'string' ? language : 'en',
    });
    persistDb();
    return buildResponse(config, result.status, resolveMediaRefs(result.data ?? ''), result.headers);
  } catch (error) {
    if (error instanceof MockHttpError) throw toAxiosError(config, error);
    if (__DEV__) console.warn('[mock] handler crashed', method, path, error instanceof Error ? error.message : '');
    throw toAxiosError(config, new MockHttpError(500, 'SERVER', 'Mock server error'));
  }
};
