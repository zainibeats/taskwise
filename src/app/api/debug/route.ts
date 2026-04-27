'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionId } from '@/lib/session';
import getDbConnection from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const sessionId = await getCurrentSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbConnection();

    const settings = db.prepare(`
      SELECT id, key, value, LENGTH(value) as value_length, created_at, updated_at
      FROM user_settings
    `).all();

    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
    const settingsSchema = db.prepare(`PRAGMA table_info(user_settings)`).all();

    const envKeyInfo = {
      exists: !!process.env.GOOGLE_AI_API_KEY,
      length: process.env.GOOGLE_AI_API_KEY?.length || 0,
      preview: process.env.GOOGLE_AI_API_KEY
        ? `${process.env.GOOGLE_AI_API_KEY.substring(0, 5)}...`
        : 'NONE'
    };

    return NextResponse.json({ tables, settingsSchema, settings, envKeyInfo, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
