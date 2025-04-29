import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getSessionFromCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    // Get session ID from cookie
    const sessionId = await getSessionFromCookie();
    
    if (sessionId) {
      // Delete session from database
      deleteSession(sessionId);
    }
    
    // Create response and clear cookie
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );
    
    // Clear the session cookie
    response.cookies.set({
      name: 'taskwise_session',
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
} 