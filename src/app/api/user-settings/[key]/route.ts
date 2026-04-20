import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionId } from '@/lib/session';
import getDbConnection from '@/lib/db';

// Define setting type
interface UserSetting {
  value: string;
  [key: string]: any;
}

// GET /api/user-settings/[key] - Get a specific setting
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const sessionId = await getCurrentSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { key } = await params;

    const db = getDbConnection();
    const setting = db.prepare(`
      SELECT value
      FROM user_settings
      WHERE key = ?
    `).get(key) as UserSetting | undefined;

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json({ value: setting.value });
  } catch (error) {
    console.error('Error fetching user setting:', error);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

// DELETE /api/user-settings/[key] - Delete a specific setting
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const sessionId = await getCurrentSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { key } = await params;

    const db = getDbConnection();
    const result = db.prepare(`
      DELETE FROM user_settings
      WHERE key = ?
    `).run(key);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user setting:', error);
    return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
  }
} 