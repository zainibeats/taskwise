import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth-utils';
import getDbConnection from '@/lib/db';

// Define setting type
interface UserSetting {
  key: string;
  value: string;
  id?: number;
  [key: string]: any;
}

// GET /api/user-settings - Get all settings for the current user
export async function GET(req: NextRequest) {
  try {
    // Get current session user
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getDbConnection();
    const settings = db.prepare(`
      SELECT key, value 
      FROM user_settings
      WHERE user_id = ?
    `).all(user.id) as UserSetting[];

    // Convert to object format
    const settingsObj: Record<string, string> = {};
    settings.forEach((setting: UserSetting) => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST /api/user-settings - Create or update a setting
export async function POST(req: NextRequest) {
  try {
    // Get current session user
    const user = await getUserFromSession(req);
    if (!user) {
      console.log("User not authenticated when saving settings");
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log(`Saving setting for user ID: ${user.id}`);
    const { key, value } = await req.json();
    
    // Validate inputs
    if (!key) {
      console.log("Missing key in request");
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    console.log(`Saving setting with key: ${key}, value length: ${value?.length || 0}`);
    
    const db = getDbConnection();
    
    // Check if setting already exists
    const existingSetting = db.prepare('SELECT id FROM user_settings WHERE user_id = ? AND key = ?').get(user.id, key) as { id: number } | undefined;
    
    if (existingSetting) {
      console.log(`Updating existing setting with ID: ${existingSetting.id}`);
      // Update existing setting
      db.prepare(`
        UPDATE user_settings
        SET value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND key = ?
      `).run(value, user.id, key);
    } else {
      console.log("Creating new setting entry");
      // Insert new setting
      db.prepare(`
        INSERT INTO user_settings (user_id, key, value)
        VALUES (?, ?, ?)
      `).run(user.id, key, value);
    }

    // Verify that the setting was saved properly
    try {
      const savedSetting = db.prepare('SELECT value FROM user_settings WHERE user_id = ? AND key = ?').get(user.id, key) as { value: string } | undefined;
      if (savedSetting) {
        const savedValueLength = savedSetting.value?.length || 0;
        console.log(`Verified setting was saved, value length: ${savedValueLength}`);
      } else {
        console.log("WARNING: Could not find setting after saving!");
      }
    } catch (verifyError) {
      console.error("Error verifying saved setting:", verifyError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving user setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
} 