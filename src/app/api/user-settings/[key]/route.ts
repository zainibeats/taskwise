import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth-utils';
import getDbConnection from '@/lib/db';

// Define setting type
interface UserSetting {
  value: string;
  [key: string]: any;
}

// GET /api/user-settings/[key] - Get a specific setting for the current user
export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Get current session user
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const key = params.key;

    const db = getDbConnection();
    const setting = db.prepare(`
      SELECT value 
      FROM user_settings
      WHERE user_id = ? AND key = ?
    `).get(user.id, key) as UserSetting | undefined;

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json({ value: setting.value });
  } catch (error) {
    console.error('Error fetching user setting:', error);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

// DELETE /api/user-settings/[key] - Delete a specific setting for the current user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Get current session user
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const key = params.key;

    const db = getDbConnection();
    const result = db.prepare(`
      DELETE FROM user_settings
      WHERE user_id = ? AND key = ?
    `).run(user.id, key);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user setting:', error);
    return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
  }
} 