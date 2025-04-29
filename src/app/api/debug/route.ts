'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth-utils';
import getDbConnection from '@/lib/db';

// GET /api/debug - Debug endpoint to check API key storage
export async function GET(req: NextRequest) {
  try {
    // Ensure this is only accessible by admin users
    const user = await getUserFromSession(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDbConnection();
    
    // Get all user settings (but mask API keys)
    const settings = db.prepare(`
      SELECT id, user_id, key, 
             CASE WHEN key = 'googleAiApiKey' THEN 
               CASE WHEN value IS NULL THEN 'NULL' 
                    WHEN value = '' THEN 'EMPTY' 
                    ELSE SUBSTR(value, 1, 5) || '...' || SUBSTR(value, -3) 
               END
             ELSE value END AS masked_value,
             LENGTH(value) as value_length,
             created_at, updated_at
      FROM user_settings
    `).all();
    
    // Get info on tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all();
    
    // Get info on users
    const users = db.prepare(`
      SELECT id, username, role FROM users
    `).all();
    
    // Get schema for user_settings
    const settingsSchema = db.prepare(`
      PRAGMA table_info(user_settings)
    `).all();
    
    // Check if there's an environment variable
    const envKeyInfo = {
      exists: !!process.env.GOOGLE_AI_API_KEY,
      length: process.env.GOOGLE_AI_API_KEY?.length || 0,
      preview: process.env.GOOGLE_AI_API_KEY 
        ? `${process.env.GOOGLE_AI_API_KEY.substring(0, 5)}...` 
        : 'NONE'
    };
    
    return NextResponse.json({
      tables,
      settingsSchema,
      settings,
      users,
      envKeyInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 