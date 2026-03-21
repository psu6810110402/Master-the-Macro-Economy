/**
 * Typed API client for Hackanomics frontend.
 * All errors from apps/api follow the standard format:
 * { statusCode, error, message, details, requestId, timestamp }
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Error Class ────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public requestId?: string,
    public details?: { field: string; issue: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Check if it's a specific HTTP status */
  is(status: number): boolean {
    return this.statusCode === status;
  }
}

// ─── Main Fetch Wrapper ─────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { auth?: boolean },
): Promise<T> {
  const { auth = true, ...fetchOptions } = options ?? {};

  // Build headers
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach auth token if available
  if (auth && typeof window !== 'undefined') {
    const token = localStorage.getItem('supabase_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(`${API_BASE}/${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    let body: any;
    try {
      body = await res.json();
    } catch {
      throw new ApiError(
        res.status,
        'NETWORK_ERROR',
        `Request failed with status ${res.status}`,
      );
    }

    throw new ApiError(
      body.statusCode ?? res.status,
      body.error ?? 'UNKNOWN_ERROR',
      body.message ?? 'An unexpected error occurred',
      body.requestId,
      body.details,
    );
  }

  // Handle empty responses (204 No Content)
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ─── Convenience Methods ────────────────────────────────────

export const api = {
  get: <T>(path: string, opts?: RequestInit) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: RequestInit) =>
    apiFetch<T>(path, {
      ...opts,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, opts?: RequestInit) =>
    apiFetch<T>(path, {
      ...opts,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, opts?: RequestInit) =>
    apiFetch<T>(path, {
      ...opts,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, opts?: RequestInit) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
};
