/** Paginated list envelope (docs/API.md §1). */
export type Page<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type PageParams = {
  page?: number;
  limit?: number;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

/** Error codes defined by the API contract. */
export const API_ERROR_CODES = [
  'VALIDATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'OTP_INVALID',
  'OTP_EXPIRED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA',
  'SERVER',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Client-side failures that never come from the server. */
type ClientErrorCode = 'NETWORK' | 'TIMEOUT' | 'OFFLINE' | 'CANCELLED' | 'UNKNOWN';

export type ErrorCode = ApiErrorCode | ClientErrorCode;

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown> | null;
  };
};

/** Progress callback for multipart uploads, 0 → 1. */
export type UploadProgressHandler = (fraction: number) => void;

/** A local file ready to be appended to RN FormData. */
export type LocalFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};
