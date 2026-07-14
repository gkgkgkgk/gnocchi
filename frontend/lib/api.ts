/**
 * Tiny fetch wrapper around the gnocchi-api backend.
 *
 * Uses relative URLs in production (Caddy in the frontend container
 * reverse-proxies /api/* to the backend on 127.0.0.1). Uses
 * `EXPO_PUBLIC_API_URL` for local dev where you're hitting Expo on
 * one port and the backend on another.
 */

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  raw?: boolean; // if true, body is FormData / Blob and Content-Type auto-set
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.raw) {
      body = opts.body as BodyInit;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const rawDetail = (parsed && (parsed as any).detail) ?? res.statusText;
    // FastAPI validation errors come back as an array of {loc, msg, type};
    // stringifying it directly yields "[object Object],..." — flatten instead.
    const detail = Array.isArray(rawDetail)
      ? rawDetail
          .map((e: any) =>
            e && e.msg ? `${Array.isArray(e.loc) ? e.loc.join('.') + ': ' : ''}${e.msg}` : String(e),
          )
          .join('; ')
      : rawDetail;
    throw new ApiError(res.status, `${res.status} ${detail}`, parsed);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T = any>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'GET', headers }),
  post: <T = any>(path: string, body?: any, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),
  put: <T = any>(path: string, body?: any, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PUT', body, headers }),
  patch: <T = any>(path: string, body?: any, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PATCH', body, headers }),
  delete: <T = any>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE', headers }),
  upload: <T = any>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData, raw: true }),
  imageUrl: (key?: string | null) => (key ? `${BASE}/images/${key}` : undefined),
  /**
   * Reverse of `imageUrl`: turn one of our own image URLs (absolute in dev,
   * relative `/images/…` in prod) back into the bare storage key. Leaves a
   * genuine external URL (or an already-bare key) unchanged — so cover images
   * round-trip through the editor without getting a doubled `/images/` path.
   */
  imageKey: (value?: string | null): string | null => {
    if (!value) return null;
    const marker = '/images/';
    const full = `${BASE}${marker}`;
    if (BASE && value.startsWith(full)) return value.slice(full.length);
    if (value.startsWith(marker)) return value.slice(marker.length);
    return value;
  },
};
