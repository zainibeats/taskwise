import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, setUserPassword, userNeedsPasswordSetup } from '@/lib/user-config';
import { createSession } from '@/lib/session';

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
    
    // Check if user exists and needs password setup
    const needsSetup = userNeedsPasswordSetup(username);
    
    if (!needsSetup) {
      return NextResponse.json(
        { error: 'User already has a password set or does not exist' },
        { status: 400 }
      );
    }
    
    // Set password
    const success = await setUserPassword(username, password);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to set password' },
        { status: 500 }
      );
    }
    
    // Get user for session
    const user = getUserByUsername(username);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Create session
    const sessionId = createSession(user);
    
    // Set cookie expiration (24 hours)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Create the response
    const response = NextResponse.json(
      { 
        success: true,
        sessionId, // Include sessionId in the response 
        user: {
          username: user.username,
          email: user.email,
          role: user.role,
        }
      },
      { status: 200 }
    );
    
    // Set the session cookie directly in the response
    response.cookies.set({
      name: 'taskwise_session',
      value: sessionId,
      expires,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while setting password' },
      { status: 500 }
    );
  }
} 