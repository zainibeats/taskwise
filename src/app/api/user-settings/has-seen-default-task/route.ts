import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth-utils';
import getDbConnection from '@/lib/db';

// Define a type for the setting
interface UserSetting {
  value: string;
}

// GET handler to check if user has seen default task
export async function GET(req: NextRequest) {
  try {
    // Get user from session
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user has the 'has-seen-default-task' setting
    const dbConn = getDbConnection();
    const setting = dbConn.prepare(
      'SELECT value FROM user_settings WHERE user_id = ? AND key = ?'
    ).get(user.id, 'has-seen-default-task') as UserSetting | undefined;

    // Return true if setting exists and is set to 'true', otherwise false
    return NextResponse.json({ 
      hasSeenDefault: setting && setting.value === 'true'
    });
  } catch (error) {
    console.error('Error checking has-seen-default-task setting:', error);
    return NextResponse.json(
      { error: 'Failed to check user setting' },
      { status: 500 }
    );
  }
}

// POST handler to set has-seen-default-task to true
export async function POST(req: NextRequest) {
  try {
    // Get user from session
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set the 'has-seen-default-task' setting to true
    const dbConn = getDbConnection();
    
    // Use UPSERT to handle both insert and update cases
    dbConn.prepare(`
      INSERT INTO user_settings (user_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
    `).run(user.id, 'has-seen-default-task', 'true');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting has-seen-default-task setting:', error);
    return NextResponse.json(
      { error: 'Failed to update user setting' },
      { status: 500 }
    );
  }
} 