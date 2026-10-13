// Verifies the session cookie issued by invoice-service ("<expiresAtMs>.<hmac>"), same AUTH_SECRET.
export const SESSION_COOKIE = 'mooe_session';

const enc = new TextEncoder();

async function hmac(data: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error('AUTH_SECRET is missing or too short');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifySession(token?: string | null) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  try {
    return safeEqual(sig, await hmac(`session:${exp}`));
  } catch {
    return false;
  }
}
