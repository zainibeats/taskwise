import { NextRequest, NextResponse } from 'next/server';
import getDbConnection from '@/lib/db';

interface AppSetting {
  key: string;
  value: string;
}

export async function GET(_req: NextRequest) {
  try {
    const db = getDbConnection();
    const settings = db.prepare('SELECT key, value FROM user_settings').all() as AppSetting[];
    const settingsObj: Record<string, string> = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json();
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }
    const db = getDbConnection();
    const existing = db.prepare('SELECT id FROM user_settings WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE user_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO user_settings (key, value) VALUES (?, ?)').run(key, value);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
