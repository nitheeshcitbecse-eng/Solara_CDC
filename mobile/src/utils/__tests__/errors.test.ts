import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { AppError, errorMessageKey, isRetryableError, shouldRetryQuery, toAppError } from '../errors';

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

function httpError(status: number, data: unknown, headers: Record<string, string> = {}) {
  return new AxiosError('failed', AxiosError.ERR_BAD_REQUEST, config, {}, {
    data,
    status,
    statusText: String(status),
    headers: new AxiosHeaders(headers),
    config,
  });
}

describe('toAppError', () => {
  it('reads the contract error body', () => {
    const error = toAppError(httpError(400, { error: { code: 'OTP_INVALID', message: 'nope', details: null } }));
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('OTP_INVALID');
    expect(error.status).toBe(400);
  });

  it('falls back to the HTTP status when the body is not the contract shape', () => {
    expect(toAppError(httpError(404, '<html>')).code).toBe('NOT_FOUND');
    expect(toAppError(httpError(503, null)).code).toBe('SERVER');
    expect(toAppError(httpError(413, {})).code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('extracts retryAfter from details or the Retry-After header', () => {
    const fromDetails = toAppError(httpError(429, { error: { code: 'RATE_LIMITED', message: '', details: { retryAfter: 60 } } }));
    expect(fromDetails.retryAfter).toBe(60);
    const fromHeader = toAppError(httpError(429, { error: { code: 'RATE_LIMITED', message: '' } }, { 'retry-after': '42' }));
    expect(fromHeader.retryAfter).toBe(42);
  });

  it('maps missing responses to NETWORK or TIMEOUT', () => {
    expect(toAppError(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)).code).toBe('NETWORK');
    expect(toAppError(new AxiosError('timeout', 'ECONNABORTED', config)).code).toBe('TIMEOUT');
  });

  it('wraps unknown values as UNKNOWN and passes AppErrors through', () => {
    expect(toAppError(new Error('boom')).code).toBe('UNKNOWN');
    const original = new AppError('OFFLINE');
    expect(toAppError(original)).toBe(original);
  });
});

describe('retry policy', () => {
  it('retries only transient failures, at most twice', () => {
    expect(isRetryableError(new AppError('NETWORK'))).toBe(true);
    expect(isRetryableError(new AppError('SERVER'))).toBe(true);
    expect(isRetryableError(new AppError('VALIDATION'))).toBe(false);
    expect(isRetryableError(new AppError('NOT_FOUND'))).toBe(false);
    expect(shouldRetryQuery(0, new AppError('TIMEOUT'))).toBe(true);
    expect(shouldRetryQuery(2, new AppError('TIMEOUT'))).toBe(false);
    expect(shouldRetryQuery(0, new AppError('FORBIDDEN'))).toBe(false);
  });
});

describe('errorMessageKey', () => {
  it('uses specific keys for known conflict reasons', () => {
    expect(errorMessageKey(new AppError('CONFLICT', { details: { reason: 'ROLE_MISMATCH' } }))).toBe('errors.ROLE_MISMATCH');
    expect(errorMessageKey(new AppError('CONFLICT', { details: { reason: 'ALREADY_APPLIED' } }))).toBe('errors.ALREADY_APPLIED');
    expect(errorMessageKey(new AppError('FORBIDDEN', { details: { reason: 'ACCOUNT_SUSPENDED' } }))).toBe(
      'errors.ACCOUNT_SUSPENDED',
    );
    expect(errorMessageKey(new AppError('SERVER'))).toBe('errors.SERVER');
  });
});
