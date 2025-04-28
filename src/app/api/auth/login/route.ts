import { NextRequest, NextResponse } from 'next/server';
import { verifyUserPassword } from '@/lib/user-config';
import { createSession, setSessionCookie } from '@/lib/session';

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
    
    // Set cookie in the response
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
    
    // Set the session cookie
    response.cookies.set({
      name: 'taskwise_session',
      value: sessionId,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 