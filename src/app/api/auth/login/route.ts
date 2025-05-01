import { NextRequest, NextResponse } from 'next/server';
import { verifyUserPassword } from '@/lib/user-config';
import { createSession } from '@/lib/session';

// Session cookie name - must match the one in session.ts
const SESSION_COOKIE_NAME = 'taskwise_session';
// Session expiration time in milliseconds (24 hours)
const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Verify credentials
    const user = await verifyUserPassword(username, password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }
    
    // Create session
    const sessionId = createSession(user);
    
    // Create the response
    const response = NextResponse.json(
      { 
        success: true, 
        user: {
          username: user.username,
          email: user.email,
          role: user.role,
        }
      },
      { status: 200 }
    );
    
    // Calculate expiration
    const expires = new Date(Date.now() + SESSION_EXPIRY);
    
    // Set the cookie directly on the response
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionId,
      expires,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    
    console.log(`[DEBUG] Session cookie set: ${SESSION_COOKIE_NAME}=${sessionId}`);
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 