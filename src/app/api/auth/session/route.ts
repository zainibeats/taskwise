import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionId, extendSession } from '@/lib/session';

export async function GET(_req: NextRequest) {
  try {
    const sessionId = await getCurrentSessionId();
    if (!sessionId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    await extendSession(sessionId);
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false, error: 'Session check failed' }, { status: 500 });
  }
} 