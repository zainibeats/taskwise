import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Database connection singleton
let dbInstance: Database.Database | null = null;

// For development: fetch from the external database service
async function fetchFromService(endpoint: string, options: RequestInit = {}) {
  const baseUrl = process.env.DB_SERVICE_URL || 'http://localhost:3100';
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error communicating with database service');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Database service error:', error);
    throw error;
  }
}

/**
 * Get a singleton database connection
 * This ensures we reuse the same connection across all API requests
 */
export function getDbConnection(): Database.Database {
  if (isDevelopment) {
    console.warn('Using direct SQLite connection in development mode is unreliable.');
    console.warn('For reliable data persistence in development, use the database service:');
    console.warn('1. Start the database service: node db/connection.js');
    console.warn('2. In another terminal: npm run dev');
  }
  
  if (!dbInstance) {
    // Ensure the data directory exists
    const DB_DIR = path.join(process.cwd(), 'data');
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const DB_PATH = path.join(DB_DIR, 'taskwise.db');
    
    // Create database instance
    dbInstance = new Database(DB_PATH);
    
    // Enable foreign keys
    dbInstance.pragma('foreign_keys = ON');
    
    // Initialize tables
    initDb(dbInstance);
    
    console.log('SQLite database connection initialized');
  }
  
  return dbInstance;
}

// Initialize tables
function initDb(db: Database.Database) {
  // Create tasks table
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

  // Create subtasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Create categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      icon TEXT NOT NULL
    )
  `);
}

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  });
}

// Export the database service API for development mode
export const dbService = {
  // Tasks
  getAllTasks: () => fetchFromService('/api/tasks'),
  getTaskById: (id: number) => fetchFromService(`/api/tasks/${id}`),
  createTask: (task: any) => fetchFromService('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),
  updateTask: (id: number, updates: any) => fetchFromService(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
  deleteTask: (id: number) => fetchFromService(`/api/tasks/${id}`, {
    method: 'DELETE',
  }),
  toggleTaskCompletion: (id: number) => fetchFromService(`/api/tasks/${id}`, {
    method: 'PATCH',
  }),
  
  // Categories
  getAllCategories: () => fetchFromService('/api/categories'),
  saveCategory: (category: any) => fetchFromService('/api/categories', {
    method: 'POST',
    body: JSON.stringify(category),
  }),
  deleteCategory: (name: string) => fetchFromService(`/api/categories?name=${encodeURIComponent(name)}`, {
    method: 'DELETE',
  }),
};

// Export the singleton getter
export default getDbConnection; 