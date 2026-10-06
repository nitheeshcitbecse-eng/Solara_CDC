import type { Role } from '../../lib/types/auth';
import type { ApiErrorCode, Page } from '../../lib/types/common';
import type { DbUser, MockDb } from './db';

/** Thrown by route handlers; the adapter converts it into the contract's error body. */
export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
  }
}

export const fail = {
  validation: (fields: Record<string, string> = {}) =>
    new MockHttpError(422, 'VALIDATION', 'Validation failed', { fields }),
  unauthorized: (message = 'Authentication required') => new MockHttpError(401, 'UNAUTHORIZED', message),
  forbidden: (reason = 'ROLE') => new MockHttpError(403, 'FORBIDDEN', 'Not allowed', { reason }),
  notFound: () => new MockHttpError(404, 'NOT_FOUND', 'Not found'),
  conflict: (reason: string) => new MockHttpError(409, 'CONFLICT', 'Conflict', { reason }),
  rateLimited: (retryAfter: number) =>
    new MockHttpError(429, 'RATE_LIMITED', 'Too many requests', { retryAfter }),
  otpInvalid: () => new MockHttpError(400, 'OTP_INVALID', 'Incorrect code'),
  otpExpired: () => new MockHttpError(400, 'OTP_EXPIRED', 'Code expired'),
  tooLarge: () => new MockHttpError(413, 'PAYLOAD_TOO_LARGE', 'File too large'),
  unsupportedMedia: () => new MockHttpError(415, 'UNSUPPORTED_MEDIA', 'Unsupported file type'),
};

export type MockFile = { uri: string; name: string; type: string };

export type MockForm = {
  fields: Record<string, string[]>;
  files: Record<string, MockFile[]>;
};

export type MockRequest = {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  form: MockForm | null;
  /** The authenticated caller (null only on public routes). */
  user: DbUser | null;
  db: MockDb;
  language: string;
};

type MockResult = { status: number; data?: unknown; headers?: Record<string, string> };

type Access = 'public' | 'any' | readonly Role[];

export type Route = {
  method: string;
  segments: string[];
  access: Access;
  handler: (request: MockRequest) => MockResult | Promise<MockResult>;
};

export function route(method: string, pattern: string, access: Access, handler: Route['handler']): Route {
  return { method, segments: pattern.split('/').filter(Boolean), access, handler };
}

export function matchRoute(routes: readonly Route[], method: string, path: string) {
  const parts = path.split('/').filter(Boolean);
  for (const candidate of routes) {
    if (candidate.method !== method || candidate.segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const matches = candidate.segments.every((segment, index) => {
      const part = parts[index] ?? '';
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = decodeURIComponent(part);
        return true;
      }
      return segment === part;
    });
    if (matches) return { route: candidate, params };
  }
  return null;
}

/** The authenticated user, asserting that the route was not public. */
export function caller(request: MockRequest): DbUser {
  if (!request.user) throw fail.unauthorized();
  return request.user;
}

export const ok = (data: unknown): MockResult => ({ status: 200, data });
export const created = (data: unknown): MockResult => ({ status: 201, data });
export const accepted = (data: unknown): MockResult => ({ status: 202, data });
export const noContent = (): MockResult => ({ status: 204 });

export function paginate<T>(items: readonly T[], query: Record<string, string>): Page<T> {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), page, limit, total: items.length };
}

export function byNewest<T extends { createdAt: string }>(a: T, b: T): number {
  return b.createdAt.localeCompare(a.createdAt);
}

// ── Body readers: throw VALIDATION with the offending field name ─────────────

export function readString(
  body: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number; optional?: boolean; pattern?: RegExp } = {},
): string {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (options.optional) return '';
    throw fail.validation({ [key]: 'required' });
  }
  if (typeof raw !== 'string') throw fail.validation({ [key]: 'type' });
  const value = raw.trim();
  if (options.min !== undefined && value.length < options.min) throw fail.validation({ [key]: 'too_short' });
  if (options.max !== undefined && value.length > options.max) throw fail.validation({ [key]: 'too_long' });
  if (options.pattern && !options.pattern.test(value)) throw fail.validation({ [key]: 'format' });
  return value;
}

export function readNumber(body: Record<string, unknown>, key: string, min: number, max: number): number {
  const raw = body[key];
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw fail.validation({ [key]: 'range' });
  }
  return value;
}

export function readEnum<T extends string>(body: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const raw = body[key];
  if (typeof raw !== 'string' || !(allowed as readonly string[]).includes(raw)) {
    throw fail.validation({ [key]: 'invalid' });
  }
  return raw as T;
}

export function readStringArray(body: Record<string, unknown>, key: string, maxItems: number, maxLength: number): string[] {
  const raw = body[key];
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > maxItems) throw fail.validation({ [key]: 'invalid' });
  return raw.map((item) => {
    if (typeof item !== 'string' || item.trim().length === 0 || item.length > maxLength) {
      throw fail.validation({ [key]: 'invalid' });
    }
    return item.trim();
  });
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
