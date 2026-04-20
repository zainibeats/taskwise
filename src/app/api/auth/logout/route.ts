import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getSessionFromCookie } from '@/lib/session';

export async function POST(_req: NextRequest) {
  try {
    const sessionId = await getSessionFromCookie();
    if (sessionId) {
      deleteSession(sessionId);
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set({
      name: 'taskwise_session',
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'An error occurred during logout' }, { status: 500 });
  }
} 