import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

// Pages require login. /api/* is forwarded to the backend, which does its own check.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /login and the public QR verification pages need no login
  if (pathname === '/login' || pathname.startsWith('/v/')) return NextResponse.next();
  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  const login = new URL('/login', req.url);
  if (pathname !== '/') login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|logo.jpg).*)'],
};
