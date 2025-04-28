import sqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const DB_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'taskwise.db');
console.log(`Using database at: ${DB_PATH}`);
const db = sqlite3(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
function initDb() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `);

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires TEXT NOT NULL,
      data TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create tasks table with user_id
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

  // Create categories table with user_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(name, user_id)
    )
  `);

  // Add migrations for existing data
  migrateExistingData();

  console.log('Database tables initialized');
}

// Migrate existing data to support user authentication
function migrateExistingData() {
  // Check if we need to add user_id column to tasks
  try {
    // Try to get a task and check if user_id exists
    const testQuery = db.prepare("SELECT user_id FROM tasks LIMIT 1");
    try {
      testQuery.get();
    } catch (error) {
      // If error, we need to add the column
      console.log('Migrating tasks table to add user_id column');
      db.exec("ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE");
    }
  } catch (error) {
    // Table doesn't exist yet or other error, skip
  }

  // Check if we need to add user_id column to categories
  try {
    // Try to get a category and check if user_id exists
    const testQuery = db.prepare("SELECT user_id FROM categories LIMIT 1");
    try {
      testQuery.get();
    } catch (error) {
      // If error, we need to add the column
      console.log('Migrating categories table to add user_id column');
      db.exec("ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE");
      
      // Update unique constraint
      db.exec("CREATE TABLE categories_new (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, icon TEXT NOT NULL, user_id INTEGER, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE(name, user_id))");
      db.exec("INSERT INTO categories_new SELECT id, name, icon, user_id FROM categories");
      db.exec("DROP TABLE categories");
      db.exec("ALTER TABLE categories_new RENAME TO categories");
    }
  } catch (error) {
    // Table doesn't exist yet or other error, skip
  }
}

// Initialize database
initDb();

// Helper to parse JSON body from requests
async function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (body) {
          resolve(JSON.parse(body));
        } else {
          resolve({});
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        resolve({});
      }
    });
  });
}

// Helper to get user ID from session
async function getUserIdFromSession(req) {
  // Get session ID from cookies
  const cookies = req.headers.cookie || '';
  const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('taskwise_session='));
  const sessionId = sessionCookie ? sessionCookie.split('=')[1].trim() : null;
  
  if (!sessionId) {
    return null;
  }
  
  // Get session
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  
  if (!session) {
    return null;
  }
  
  // Check if session is expired
  if (new Date(session.expires) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }
  
  return session.user_id;
}

// Create HTTP server to handle database operations
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Log request
  console.log(`${req.method} ${path}`);

  try {
    // Tasks API
    if (path.startsWith('/api/tasks')) {
      // Get the user ID from session for user-specific data
      const userId = await getUserIdFromSession(req);
      
      if (!userId) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      
      const taskIdMatch = path.match(/\/api\/tasks\/(\d+)/);
      const taskId = taskIdMatch ? parseInt(taskIdMatch[1], 10) : null;

      // Get all tasks
      if (path === '/api/tasks' && req.method === 'GET') {
        // Only get tasks for the current user
        const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY priority_score DESC').all(userId);
        
        // Get subtasks for each task
        const tasksWithSubtasks = tasks.map(task => {
          const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(task.id);
          return { ...task, subtasks };
        });
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(tasksWithSubtasks));
        return;
      }
      
      // Create task
      if (path === '/api/tasks' && req.method === 'POST') {
        const task = await parseJsonBody(req);
        
        if (!task.title) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Title is required' }));
          return;
        }
        
        const { title, description, deadline, importance, category, priority_score, is_completed = false, subtasks = [] } = task;
        
        // Add user_id to the task
        const result = db.prepare(`
          INSERT INTO tasks (title, description, deadline, importance, category, priority_score, is_completed, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(title, description, deadline, importance, category, priority_score, is_completed ? 1 : 0, userId);
        
        const taskId = result.lastInsertRowid;
        
        // Add subtasks if any
        if (subtasks.length > 0) {
          const insertSubtask = db.prepare('INSERT INTO subtasks (task_id, description, is_completed) VALUES (?, ?, ?)');
          
          subtasks.forEach(subtask => {
            insertSubtask.run(taskId, subtask.description, subtask.is_completed ? 1 : 0);
          });
        }
        
        // Get the created task with subtasks
        const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        const taskSubtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(taskId);
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 201;
        res.end(JSON.stringify({ ...createdTask, subtasks: taskSubtasks }));
        return;
      }
      
      // Single task operations
      if (taskId !== null) {
        // Verify task belongs to current user
        const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
        
        if (!task) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Task not found' }));
          return;
        }
        
        // Get task by ID
        if (req.method === 'GET') {
          const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(taskId);
          
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ...task, subtasks }));
          return;
        }
        
        // Update task
        if (req.method === 'PUT') {
          const updates = await parseJsonBody(req);
          
          // Check if task exists
          const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
          if (!existingTask) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Task not found' }));
            return;
          }
          
          const { title, description, deadline, importance, category, priority_score, is_completed, subtasks } = updates;
          
          // Prepare update parts
          const updateParts = [];
          const params = [];
          
          if (title !== undefined) {
            updateParts.push('title = ?');
            params.push(title);
          }
          
          if (description !== undefined) {
            updateParts.push('description = ?');
            params.push(description);
          }
          
          if (deadline !== undefined) {
            updateParts.push('deadline = ?');
            params.push(deadline);
          }
          
          if (importance !== undefined) {
            updateParts.push('importance = ?');
            params.push(importance);
          }
          
          if (category !== undefined) {
            updateParts.push('category = ?');
            params.push(category);
          }
          
          if (priority_score !== undefined) {
            updateParts.push('priority_score = ?');
            params.push(priority_score);
          }
          
          if (is_completed !== undefined) {
            updateParts.push('is_completed = ?');
            params.push(is_completed ? 1 : 0);
          }
          
          // If there are fields to update
          if (updateParts.length > 0) {
            params.push(taskId); // Add id for WHERE clause
            
            db.prepare(`
              UPDATE tasks
              SET ${updateParts.join(', ')}
              WHERE id = ?
            `).run(...params);
          }
          
          // Update subtasks if provided
          if (subtasks) {
            // First delete existing subtasks
            db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(taskId);
            
            // Then add new subtasks
            if (subtasks.length > 0) {
              const insertSubtask = db.prepare('INSERT INTO subtasks (task_id, description, is_completed) VALUES (?, ?, ?)');
              
              subtasks.forEach(subtask => {
                insertSubtask.run(taskId, subtask.description, subtask.is_completed ? 1 : 0);
              });
            }
          }
          
          // Get the updated task with subtasks
          const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
          const taskSubtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(taskId);
          
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ...updatedTask, subtasks: taskSubtasks }));
          return;
        }
        
        // Delete task
        if (req.method === 'DELETE') {
          const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
          
          if (result.changes === 0) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Task not found' }));
            return;
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true }));
          return;
        }
        
        // Toggle task completion
        if (req.method === 'PATCH') {
          const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
          
          if (!task) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Task not found' }));
            return;
          }
          
          // Toggle completion status
          const newStatus = task.is_completed ? 0 : 1;
          db.prepare('UPDATE tasks SET is_completed = ? WHERE id = ?').run(newStatus, taskId);
          
          // Get the updated task with subtasks
          const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
          const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(taskId);
          
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ...updatedTask, subtasks }));
          return;
        }
      }
    }
    
    // Categories API
    if (path.startsWith('/api/categories')) {
      // Get the user ID from session for user-specific data
      const userId = await getUserIdFromSession(req);
      
      if (!userId) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      
      // Get all categories
      if (path === '/api/categories' && req.method === 'GET') {
        // Only get categories for the current user
        const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(categories));
        return;
      }
      
      // Create/Update category
      if (path === '/api/categories' && req.method === 'POST') {
        const category = await parseJsonBody(req);
        
        if (!category.name) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Category name is required' }));
          return;
        }
        
        const { name, icon } = category;
        
        // Check if category exists for this user
        const existingCategory = db.prepare('SELECT * FROM categories WHERE name = ? AND user_id = ?').get(name, userId);
        
        if (existingCategory) {
          // Update existing category
          db.prepare('UPDATE categories SET icon = ? WHERE id = ?').run(icon, existingCategory.id);
          
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ id: existingCategory.id, name, icon, user_id: userId }));
        } else {
          // Create new category
          const result = db.prepare('INSERT INTO categories (name, icon, user_id) VALUES (?, ?, ?)').run(name, icon, userId);
          
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 201;
          res.end(JSON.stringify({ id: result.lastInsertRowid, name, icon, user_id: userId }));
        }
        
        return;
      }
      
      // Delete category
      if (path.startsWith('/api/categories') && req.method === 'DELETE') {
        // Extract category name from query parameters
        const url = new URL(req.url, `http://${req.headers.host}`);
        const categoryName = url.searchParams.get('name');
        
        if (!categoryName) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Category name is required' }));
          return;
        }
        
        // Check if the category exists for this user
        const existingCategory = db.prepare('SELECT * FROM categories WHERE name = ? AND user_id = ?').get(categoryName, userId);
        
        if (!existingCategory) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Category not found' }));
          return;
        }
        
        // Delete the category
        db.prepare('DELETE FROM categories WHERE id = ?').run(existingCategory.id);
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true }));
        return;
      }
    }
    
    // Auth API routes
    if (path.startsWith('/api/auth')) {
      // Login
      if (path === '/api/auth/login' && req.method === 'POST') {
        const { username, password } = await parseJsonBody(req);
        
        if (!username || !password) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Username and password are required' }));
          return;
        }
        
        // Get user
        const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
        
        if (!user || !user.password_hash) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: 'Invalid username or password' }));
          return;
        }
        
        // Verify password (would use bcrypt here in a proper implementation)
        // For simplicity in this external service, we'll just compare hashes directly
        // (In a real app, you'd use bcrypt.compare)
        const passwordMatch = user.password_hash === password; // Not secure, just for demo!
        
        if (!passwordMatch) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: 'Invalid username or password' }));
          return;
        }
        
        // Create session
        const sessionId = crypto.randomUUID();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        db.prepare(`
          INSERT INTO sessions (id, user_id, expires, data)
          VALUES (?, ?, ?, ?)
        `).run(sessionId, user.id, expires, JSON.stringify({ username: user.username, role: user.role }));
        
        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
        
        // Return user info and session ID
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          sessionId,
          user: {
            username: user.username,
            email: user.email,
            role: user.role,
          }
        }));
        return;
      }
      
      // Set password
      if (path === '/api/auth/set-password' && req.method === 'POST') {
        const { username, password } = await parseJsonBody(req);
        
        if (!username || !password) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Username and password are required' }));
          return;
        }
        
        // Check if user exists and doesn't have a password
        const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
        
        if (!user) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }
        
        if (user.password_hash) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'User already has a password set' }));
          return;
        }
        
        // Set password (would use bcrypt here in a proper implementation)
        // For simplicity in this external service, we'll just store the raw password
        // (In a real app, you'd use bcrypt.hash)
        db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(password, username);
        
        // Create session
        const sessionId = crypto.randomUUID();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        db.prepare(`
          INSERT INTO sessions (id, user_id, expires, data)
          VALUES (?, ?, ?, ?)
        `).run(sessionId, user.id, expires, JSON.stringify({ username: user.username, role: user.role }));
        
        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
        
        // Return success
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          sessionId,
          user: {
            username: user.username,
            email: user.email,
            role: user.role,
          }
        }));
        return;
      }
      
      // Get session
      if (path === '/api/auth/session' && req.method === 'GET') {
        // Get session ID from cookies
        const cookies = req.headers.cookie || '';
        const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('taskwise_session='));
        const sessionId = sessionCookie ? sessionCookie.split('=')[1].trim() : null;
        
        if (!sessionId) {
          res.statusCode = 401;
          res.end(JSON.stringify({ authenticated: false }));
          return;
        }
        
        // Delete expired sessions
        db.prepare('DELETE FROM sessions WHERE expires < CURRENT_TIMESTAMP').run();
        
        // Get session
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        
        if (!session) {
          res.statusCode = 401;
          res.end(JSON.stringify({ authenticated: false }));
          return;
        }
        
        // Check if session is expired
        if (new Date(session.expires) < new Date()) {
          db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
          res.statusCode = 401;
          res.end(JSON.stringify({ authenticated: false }));
          return;
        }
        
        // Get user info
        const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(session.user_id);
        
        if (!user) {
          res.statusCode = 401;
          res.end(JSON.stringify({ authenticated: false }));
          return;
        }
        
        // Extend session
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        db.prepare('UPDATE sessions SET expires = ? WHERE id = ?').run(expires, sessionId);
        
        // Return user info
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
          authenticated: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          }
        }));
        return;
      }
      
      // Logout
      if (path === '/api/auth/logout' && req.method === 'POST') {
        // Get session ID from cookies
        const cookies = req.headers.cookie || '';
        const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('taskwise_session='));
        const sessionId = sessionCookie ? sessionCookie.split('=')[1].trim() : null;
        
        if (sessionId) {
          // Delete session
          db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
        }
        
        // Return success
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true }));
        return;
      }
    }
    
    // Users API routes
    if (path.startsWith('/api/users')) {
      // Sync users from config to database
      if (path === '/api/users/sync' && req.method === 'POST') {
        try {
          const configUsers = await parseJsonBody(req);
          
          if (!Array.isArray(configUsers.users)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid users config format' }));
            return;
          }
          
          // Get existing users from the database
          const existingUsers = db.prepare('SELECT id, username, email, role, active FROM users').all();
          const existingUserMap = new Map(existingUsers.map(user => [user.username, user]));
          
          // Process each user in the config
          for (const configUser of configUsers.users) {
            const existingUser = existingUserMap.get(configUser.username);
            
            if (existingUser) {
              // Update existing user
              db.prepare(`
                UPDATE users 
                SET 
                  email = ?, 
                  role = ?, 
                  active = ?
                WHERE username = ?
              `).run(
                configUser.email || existingUser.email,
                configUser.role || existingUser.role || 'user',
                configUser.active !== undefined ? (configUser.active ? 1 : 0) : (existingUser.active ? 1 : 0),
                configUser.username
              );
            } else {
              // Insert new user without password (password will be set on first login)
              db.prepare(`
                INSERT INTO users (username, email, role, active)
                VALUES (?, ?, ?, ?)
              `).run(
                configUser.username,
                configUser.email || null,
                configUser.role || 'user',
                configUser.active !== undefined ? (configUser.active ? 1 : 0) : 1
              );
            }
          }
          
          // Return success
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          console.error('Error syncing users:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Error syncing users' }));
        }
        return;
      }
    }
    
    // Route not found
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
  }
});

// Start the server
const PORT = process.env.DB_SERVER_PORT || 3100;
server.listen(PORT, () => {
  console.log(`Database server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Closing database connection...');
  db.close();
  process.exit(0);
}); 