import sqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

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

  console.log('Database tables initialized');
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
      const taskIdMatch = path.match(/\/api\/tasks\/(\d+)/);
      const taskId = taskIdMatch ? parseInt(taskIdMatch[1], 10) : null;

      // Get all tasks
      if (path === '/api/tasks' && req.method === 'GET') {
        const tasks = db.prepare('SELECT * FROM tasks ORDER BY priority_score DESC').all();
        
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
        
        const result = db.prepare(`
          INSERT INTO tasks (title, description, deadline, importance, category, priority_score, is_completed)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(title, description, deadline, importance, category, priority_score, is_completed ? 1 : 0);
        
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
        // Get task by ID
        if (req.method === 'GET') {
          const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
          
          if (!task) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Task not found' }));
            return;
          }
          
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
      // Get all categories
      if (path === '/api/categories' && req.method === 'GET') {
        const categories = db.prepare('SELECT * FROM categories').all();
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(categories));
        return;
      }
      
      // Create or update category
      if (path === '/api/categories' && req.method === 'POST') {
        const category = await parseJsonBody(req);
        
        if (!category.name || !category.icon) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Name and icon are required' }));
          return;
        }
        
        const existing = db.prepare('SELECT * FROM categories WHERE name = ?').get(category.name);
        
        if (existing) {
          db.prepare('UPDATE categories SET icon = ? WHERE name = ?').run(category.icon, category.name);
        } else {
          db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)').run(category.name, category.icon);
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 201;
        res.end(JSON.stringify(category));
        return;
      }
      
      // Delete category
      if (path === '/api/categories' && req.method === 'DELETE') {
        const name = url.searchParams.get('name');
        
        if (!name) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Category name is required' }));
          return;
        }
        
        const result = db.prepare('DELETE FROM categories WHERE name = ?').run(name);
        
        if (result.changes === 0) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Category not found' }));
          return;
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true }));
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