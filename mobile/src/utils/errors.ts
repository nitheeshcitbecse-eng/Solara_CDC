import { isAxiosError, isCancel } from 'axios';

import { API_ERROR_CODES, type ApiErrorCode, type ErrorCode } from '../lib/types/common';

/**
 * The only error type the UI ever sees. Screens show a translated message chosen
 * by `code` — never the server's `message`, and never a stack trace.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number | null;
  /** Seconds to wait before retrying (RATE_LIMITED). */
  readonly retryAfter: number | null;
  readonly details: Record<string, unknown> | null;

  constructor(
    code: ErrorCode,
    options: { status?: number | null; retryAfter?: number | null; details?: Record<string, unknown> | null; message?: string } = {},
  ) {
    super(options.message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? null;
    this.retryAfter = options.retryAfter ?? null;
    this.details = options.details ?? null;
  }
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function codeFromStatus(status: number): ErrorCode {
  if (status === 400 || status === 422) return 'VALIDATION';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 415) return 'UNSUPPORTED_MEDIA';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER';
  return 'UNKNOWN';
}

function parseRetryAfter(headerValue: unknown, details: Record<string, unknown> | null): number | null {
  const fromDetails = details?.retryAfter;
  if (typeof fromDetails === 'number' && Number.isFinite(fromDetails)) return fromDetails;
  if (typeof headerValue === 'string' || typeof headerValue === 'number') {
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  }
  return null;
}

/** Converts anything thrown (axios errors, AppErrors, plain errors) into an AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (isCancel(error)) return new AppError('CANCELLED');

  if (isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      // No response: the request never reached the server or timed out on the way.
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      return new AppError(timedOut ? 'TIMEOUT' : 'NETWORK');
    }
    const body: unknown = response.data;
    const apiError = isRecord(body) && isRecord(body.error) ? body.error : null;
    const details = apiError && isRecord(apiError.details) ? apiError.details : null;
    const code = apiError && isApiErrorCode(apiError.code) ? apiError.code : codeFromStatus(response.status);
    const headers: unknown = response.headers;
    const retryAfterHeader = isRecord(headers) ? headers['retry-after'] : undefined;
    return new AppError(code, {
      status: response.status,
      details,
      retryAfter: parseRetryAfter(retryAfterHeader, details),
      message: typeof apiError?.message === 'string' ? apiError.message : undefined,
    });
  }

  return new AppError('UNKNOWN');
}

/** Only transient failures are worth retrying; 4xx errors will fail the same way again. */
export function isRetryableError(error: unknown): boolean {
  const { code } = toAppError(error);
  return code === 'NETWORK' || code === 'TIMEOUT' || code === 'SERVER';
}

const MAX_QUERY_RETRIES = 2;

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_QUERY_RETRIES && isRetryableError(error);
}

/** i18n key for the user-facing message of an error. */
export function errorMessageKey(error: unknown) {
  const appError = toAppError(error);
  if (appError.code === 'CONFLICT') {
    const reason = appError.details?.reason;
    if (reason === 'ROLE_MISMATCH') return 'errors.ROLE_MISMATCH' as const;
    if (reason === 'ALREADY_APPLIED') return 'errors.ALREADY_APPLIED' as const;
  }
  if (appError.code === 'FORBIDDEN' && appError.details?.reason === 'ACCOUNT_SUSPENDED') {
    return 'errors.ACCOUNT_SUSPENDED' as const;
  }
  return `errors.${appError.code}` as const;
}
