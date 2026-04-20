import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDbConnection(): Database.Database {
  if (!dbInstance) {
    const DB_DIR = path.join(process.cwd(), 'data');
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const DB_PATH = path.join(DB_DIR, 'taskwise.db');
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('foreign_keys = ON');
    initDb(dbInstance);
  }
  return dbInstance;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.prepare('INSERT OR IGNORE INTO app_config (id, password_hash) VALUES (1, NULL)').run();

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      expires TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      importance INTEGER CHECK (importance BETWEEN 1 AND 10),
      category TEXT,
      priority_score REAL,
      is_completed BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  migrateExistingData(db);
}

function migrateExistingData(db: Database.Database) {
  // Migrate tasks: rebuild without user_id if it exists
  try {
    const cols = (db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes('user_id')) {
      db.exec(`
        CREATE TABLE tasks_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          deadline TEXT,
          importance INTEGER CHECK (importance BETWEEN 1 AND 10),
          category TEXT,
          priority_score REAL,
          is_completed BOOLEAN DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO tasks_new (id, title, description, deadline, importance, category, priority_score, is_completed, created_at)
          SELECT id, title, description, deadline, importance, category, priority_score, is_completed, created_at FROM tasks;
        DROP TABLE tasks;
        ALTER TABLE tasks_new RENAME TO tasks;
      `);
    }
  } catch {}

  // Migrate categories: rebuild without user_id if it exists
  try {
    const cols = (db.prepare("PRAGMA table_info(categories)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes('user_id')) {
      db.exec(`
        CREATE TABLE categories_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          icon TEXT NOT NULL
        );
        INSERT OR IGNORE INTO categories_new (id, name, icon)
          SELECT id, name, icon FROM categories WHERE user_id IS NULL;
        DROP TABLE categories;
        ALTER TABLE categories_new RENAME TO categories;
      `);
    }
  } catch {}

  // Migrate user_settings: rebuild without user_id if it exists
  try {
    const cols = (db.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes('user_id')) {
      db.exec(`
        CREATE TABLE user_settings_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO user_settings_new (key, value, created_at, updated_at)
          SELECT key, value, created_at, updated_at FROM user_settings;
        DROP TABLE user_settings;
        ALTER TABLE user_settings_new RENAME TO user_settings;
      `);
    }
  } catch {}

  // Migrate sessions: rebuild without user_id if it exists
  try {
    const cols = (db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes('user_id')) {
      db.exec(`
        CREATE TABLE sessions_new (
          id TEXT PRIMARY KEY,
          expires TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        DROP TABLE sessions;
        ALTER TABLE sessions_new RENAME TO sessions;
      `);
    }
  } catch {}

  // Drop users table if it exists (no longer needed)
  try {
    db.exec('DROP TABLE IF EXISTS users');
  } catch {}
}

if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  });
}

export default getDbConnection;
