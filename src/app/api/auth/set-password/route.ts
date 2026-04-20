import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import getDbConnection from '@/lib/db';
import { deleteAllSessions, createSession } from '@/lib/session';

const SESSION_COOKIE_NAME = 'taskwise_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { password, currentPassword } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDbConnection();
    const config = db.prepare('SELECT password_hash FROM app_config WHERE id = 1').get() as { password_hash: string | null } | null;

    // If a password already exists, require the current password to change it
    if (config?.password_hash) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 });
      }
      const match = await bcrypt.compare(currentPassword, config.password_hash);
      if (!match) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE app_config SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(passwordHash);

    // Invalidate all existing sessions after password change
    deleteAllSessions();

    // Create a fresh session for the current user
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
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'An error occurred while setting password' }, { status: 500 });
  }
}
