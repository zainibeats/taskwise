'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionId } from '@/lib/session';
import getDbConnection from '@/lib/db';

// GET /api/debug/fix-db - Fix database structure
export async function GET(_req: NextRequest) {
  try {
    const sessionId = await getCurrentSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbConnection();
    const results: { actions: string[] } = { actions: [] };

    // Check if user_settings table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='user_settings'
    `).get();

    if (!tableExists) {
      // Create the table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      results.actions.push('Created user_settings table');
    } else {
      results.actions.push('user_settings table already exists');
    }

    // Check if value column exists
    try {
      const columns = db.prepare('PRAGMA table_info(user_settings)').all() as any[];
      const hasValueColumn = columns.some(column => column.name === 'value');

      if (!hasValueColumn) {
        // Add value column if it doesn't exist
        db.exec("ALTER TABLE user_settings ADD COLUMN value TEXT");
        results.actions.push('Added value column to user_settings table');
      } else {
        results.actions.push('value column already exists');
      }
    } catch (error) {
      results.actions.push(`Error checking columns: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Try to add a test setting to verify functionality
    try {
      const existingSetting = db.prepare('SELECT id FROM user_settings WHERE key = ?').get('db_test');

      if (existingSetting) {
        // Update existing setting
        db.prepare(`
          UPDATE user_settings
          SET value = ?, updated_at = CURRENT_TIMESTAMP
          WHERE key = ?
        `).run('test-value', 'db_test');
        results.actions.push('Updated test setting');
      } else {
        // Insert new setting
        db.prepare(`
          INSERT INTO user_settings (key, value)
          VALUES (?, ?)
        `).run('db_test', 'test-value');
        results.actions.push('Created test setting');
      }

      // Verify setting was saved
      const testSetting = db.prepare('SELECT value FROM user_settings WHERE key = ?').get('db_test') as { value: string } | undefined;
      if (testSetting && testSetting.value === 'test-value') {
        results.actions.push('Database functionality verified successfully');
      } else {
        results.actions.push('WARNING: Test setting verification failed');
      }
    } catch (error) {
      results.actions.push(`Error testing database: ${error instanceof Error ? error.message : String(error)}`);
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fixing database:', error);
    return NextResponse.json({
      error: 'Failed to fix database',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
