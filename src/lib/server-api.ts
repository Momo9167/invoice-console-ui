import 'server-only';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:3200';

// Server-side call to invoice-service, forwarding the visitor's login cookie.
export async function serverApi<T>(path: string): Promise<T | null> {
  const cookie = (await headers()).get('cookie') || '';
  const r = await fetch(`${API_URL}${path}`, { headers: { cookie }, cache: 'no-store' });
  return r.ok ? r.json() : null;
}
