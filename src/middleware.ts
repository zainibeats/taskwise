import { NextRequest, NextResponse } from 'next/server';
import { hasValidSession } from '@/lib/middleware-check';

// Paths that are public (don't require authentication)
const PUBLIC_PATHS = [
  '/login',
  '/setup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/set-password',
  '/api/auth/setup-admin',
  '/api/auth/setup-required',
  '/api/auth/password-needed',
  '/api/auth/session',
];

// API paths that should check user session
const PROTECTED_API_PATHS = [
  '/api/tasks',
  '/api/categories',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // For the root path, we'll let the page component handle the setup check
  // instead of doing it in middleware to avoid Edge Runtime limitations
  if (pathname === '/' || pathname === '') {
    return NextResponse.next();
  }
  
  // Check if the request is for an API route
  const isApiRoute = PROTECTED_API_PATHS.some(path => pathname.startsWith(path));
  
  // Check session
  if (!hasValidSession(request)) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    } else {
      // Redirect to login page for non-API routes
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Continue with the request
  return NextResponse.next();
}

export const config = {
  // Match all request paths except for static files, images, favicon, etc.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|images/).*)',
  ],
}; 