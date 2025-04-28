import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, extendSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    // Get current session
    const session = getCurrentSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        authenticated: false,
        user: null
      }, { status: 401 });
    }
    
    // Extend session
    extendSession(session.id);
    
    // Return user data without sensitive information
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
        email: session.user.email
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'An error occurred checking session', authenticated: false },
      { status: 500 }
    );
  }
} 