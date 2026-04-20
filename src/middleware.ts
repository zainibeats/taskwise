import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'taskwise_session';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/set-password',
  '/api/auth/config',
  '/api/auth/session',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if password protection is enabled (Edge-safe: use fetch)
  try {
    const baseUrl = new URL(request.url).origin;
    const configRes = await fetch(`${baseUrl}/api/auth/config`);
    if (configRes.ok) {
      const { passwordSet } = await configRes.json();
      if (!passwordSet) {
        return NextResponse.next();
      }
    }
  } catch {
    // If config check fails, allow through (fail open for availability)
    return NextResponse.next();
  }

  // Password is set — require a valid session cookie
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/|images/).*)',],
};
