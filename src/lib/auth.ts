// Signed session cookie: "<userId>.<expiresAtMs>.<hmac>". Web Crypto only, so it also runs in middleware.
// Keep this file identical in invoice-service and invoice-console-ui.
export const SESSION_COOKIE = 'mooe_session';
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function hmac(data: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error('AUTH_SECRET is missing or too short');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSession(userId: string) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  return `${userId}.${exp}.${await hmac(`session:${userId}:${exp}`)}`;
}

// Returns the signed-in user's id, or null.
export async function verifySession(token?: string | null): Promise<string | null> {
  if (!token) return null;
  const [userId, exp, sig] = token.split('.');
  if (!userId || !exp || !sig || !(Number(exp) > Date.now())) return null;
  try {
    return safeEqual(sig, await hmac(`session:${userId}:${exp}`)) ? userId : null;
  } catch {
    return null;
  }
}
