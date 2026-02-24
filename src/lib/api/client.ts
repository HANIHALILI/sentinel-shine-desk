import { env } from '@/lib/env';
import type { ApiError } from './types';

// ============================================================
// HTTP Client with retry, timeout, and error normalization
// ============================================================

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  retries?: number;
}

let _getAccessToken: (() => Promise<string | null>) | null = null;

/** Register the auth token provider (called by AuthProvider) */
export function setTokenProvider(fn: () => Promise<string | null>) {
  _getAccessToken = fn;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = env.API_BASE_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    params,
    timeout = env.API_TIMEOUT,
    retries = env.API_MAX_RETRIES,
    headers: extraHeaders,
    ...fetchOpts
  } = options;

  const url = buildUrl(path, params);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(extraHeaders as Record<string, string> || {}),
  };

  // Attach bearer token if available
  if (_getAccessToken) {
    const token = await _getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    ...fetchOpts,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeout);

      if (!response.ok) {
        let apiError: ApiError;
        try {
          apiError = await response.json();
        } catch {
          apiError = {
            code: 'UNKNOWN_ERROR',
            message: response.statusText || 'Request failed',
            status: response.status,
          };
        }
        apiError.status = response.status;

        if (isRetryable(response.status) && attempt < retries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
          await sleep(backoff);
          continue;
        }

        throw new ApiClientError(apiError);
      }

      // 204 No Content
      if (response.status === 204) return undefined as T;

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof ApiClientError) throw err;

      lastError = err as Error;

      if ((err as Error).name === 'AbortError') {
        throw new ApiClientError({
          code: 'TIMEOUT',
          message: `Request timed out after ${timeout}ms`,
          status: 408,
        });
      }

      if (attempt < retries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(backoff);
        continue;
      }
    }
  }

  throw new ApiClientError({
    code: 'NETWORK_ERROR',
    message: lastError?.message || 'Network request failed',
    status: 0,
  });
}

// Convenience methods
export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body }),

  delete: <T = void>(path: string) =>
    apiRequest<T>(path, { method: 'DELETE' }),
};
