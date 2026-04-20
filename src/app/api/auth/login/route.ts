import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import getDbConnection from '@/lib/db';
import { createSession } from '@/lib/session';

const SESSION_COOKIE_NAME = 'taskwise_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const db = getDbConnection();
    const config = db.prepare('SELECT password_hash FROM app_config WHERE id = 1').get() as { password_hash: string | null } | null;

    if (!config?.password_hash) {
      return NextResponse.json({ error: 'No password set' }, { status: 400 });
    }

    const match = await bcrypt.compare(password, config.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const sessionId = createSession();
    const expires = new Date(Date.now() + SESSION_EXPIRY_MS);

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionId,
      expires,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
