'use client';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  if (r.status === 401 && !path.startsWith('/api/auth/')) {
    location.href = '/login?next=' + encodeURIComponent(location.pathname);
    throw new ApiError('Not signed in', 401);
  }
  if (!r.ok) throw new ApiError((await r.json().catch(() => ({}))).error || r.statusText, r.status);
  return r.json();
}
