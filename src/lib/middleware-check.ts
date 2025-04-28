// This file provides setup check functions that are safe to use in middleware (Edge runtime)
// It doesn't use any Node.js modules like fs, path, or database connections

import { NextRequest } from 'next/server';

// Session cookie name
const SESSION_COOKIE_NAME = 'taskwise_session';

/**
 * Check if the user has a valid session cookie
 */
export function hasValidSession(request: NextRequest): boolean {
  return !!request.cookies.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Check if we should redirect to setup page
 * This function is safe to use in middleware (Edge runtime)
 */
export async function shouldRedirectToSetup(request: NextRequest): Promise<boolean> {
  try {
    // Make an API call to check if setup is required
    // This avoids using the database directly in middleware
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/auth/setup-required`);
    
    if (response.ok) {
      const data = await response.json();
      return data.setupRequired;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking setup status in middleware:', error);
    return false;
  }
}

/**
 * Check if the current session belongs to an admin user
 * This makes an API call to avoid using database directly in middleware
 */
export async function hasAdminPrivileges(request: NextRequest): Promise<boolean> {
  try {
    if (!hasValidSession(request)) {
      return false;
    }
    
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.user?.role === 'admin';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status in middleware:', error);
    return false;
  }
} 