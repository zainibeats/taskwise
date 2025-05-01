import { getDbConnection } from './db';

/**
 * Run database migrations to ensure schema is up-to-date
 * This should be called during application startup
 */
export function migrateDatabase() {
  const db = getDbConnection();
  
  console.log("Running database migrations...");
  
  // Check if user_settings table exists and has the right columns
  const hasUserSettingsTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'"
  ).get();
  
  if (!hasUserSettingsTable) {
    console.log("Creating user_settings table...");
    db.exec(`
      CREATE TABLE user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, key)
      );
    `);
  } else {
    // Check if key and value columns exist
    try {
      db.prepare("SELECT key, value FROM user_settings LIMIT 1").get();
      console.log("user_settings table schema is valid");
    } catch (error) {
      console.log("Updating user_settings table schema...");
      
      // Create a temporary table with the correct schema
      db.exec(`
        CREATE TABLE user_settings_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(user_id, key)
        );
        
        -- Try to copy any existing data if possible
        INSERT OR IGNORE INTO user_settings_new (id, user_id)
        SELECT id, user_id FROM user_settings;
        
        -- Drop the old table
        DROP TABLE user_settings;
        
        -- Rename the new table
        ALTER TABLE user_settings_new RENAME TO user_settings;
      `);
    }
  }
  
  console.log("Database migrations completed");
} 