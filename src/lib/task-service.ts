import getDbConnection, { dbService } from './db';
import { Task, Subtask, Category } from '../app/types';

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Get database connection
const getDb = () => getDbConnection();

// Task operations
export const taskService = {
  // Get all tasks
  getAllTasks: async (): Promise<Task[]> => {
    if (isDevelopment) {
      return dbService.getAllTasks();
    }
    
    const db = getDb();
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY priority_score DESC').all() as Task[];
    
    // Get subtasks for each task
    return tasks.map(task => {
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(task.id) as Subtask[];
      return { ...task, subtasks };
    });
  },

  // Get task by ID
  getTaskById: async (id: number): Promise<Task | undefined> => {
    if (isDevelopment) {
      return dbService.getTaskById(id);
    }
    
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
    
    if (!task) return undefined;
    
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(task.id) as Subtask[];
    return { ...task, subtasks };
  },

  // Create a new task
  createTask: async (task: Omit<Task, 'id'>): Promise<Task> => {
    if (isDevelopment) {
      return dbService.createTask(task);
    }
    
    const db = getDb();
    const { title, description, deadline, importance, category, priority_score, is_completed = false, subtasks = [] } = task;
    
    const result = db.prepare(`
      INSERT INTO tasks (title, description, deadline, importance, category, priority_score, is_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, deadline, importance, category, priority_score, is_completed ? 1 : 0);
    
    const taskId = result.lastInsertRowid as number;
    
    // Add subtasks if any
    if (subtasks.length > 0) {
      const insertSubtask = db.prepare('INSERT INTO subtasks (task_id, description, is_completed) VALUES (?, ?, ?)');
      
      subtasks.forEach((subtask: Subtask) => {
        insertSubtask.run(taskId, subtask.description, subtask.is_completed ? 1 : 0);
      });
    }
    
    const newTask = await taskService.getTaskById(taskId);
    if (!newTask) throw new Error('Failed to create task');
    return newTask;
  },

  // Update an existing task
  updateTask: async (id: number, updates: Partial<Task>): Promise<Task | undefined> => {
    if (isDevelopment) {
      return dbService.updateTask(id, updates);
    }
    
    const db = getDb();
    const { title, description, deadline, importance, category, priority_score, is_completed, subtasks } = updates;
    
    // Check if task exists
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existingTask) return undefined;
    
    // Prepare update parts
    const updateParts: string[] = [];
    const params: any[] = [];
    
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
      params.push(id); // Add id for WHERE clause
      
      db.prepare(`
        UPDATE tasks
        SET ${updateParts.join(', ')}
        WHERE id = ?
      `).run(...params);
    }
    
    // Update subtasks if provided
    if (subtasks) {
      // First delete existing subtasks
      db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(id);
      
      // Then add new subtasks
      if (subtasks.length > 0) {
        const insertSubtask = db.prepare('INSERT INTO subtasks (task_id, description, is_completed) VALUES (?, ?, ?)');
        
        subtasks.forEach((subtask: Subtask) => {
          insertSubtask.run(id, subtask.description, subtask.is_completed ? 1 : 0);
        });
      }
    }
    
    return taskService.getTaskById(id);
  },

  // Delete a task
  deleteTask: async (id: number): Promise<boolean> => {
    if (isDevelopment) {
      await dbService.deleteTask(id);
      return true;
    }
    
    const db = getDb();
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // Toggle task completion
  toggleTaskCompletion: async (id: number): Promise<Task | undefined> => {
    if (isDevelopment) {
      return dbService.toggleTaskCompletion(id);
    }
    
    const db = getDb();
    const task = await taskService.getTaskById(id);
    if (!task) return undefined;
    
    db.prepare('UPDATE tasks SET is_completed = ? WHERE id = ?')
      .run(task.is_completed ? 0 : 1, id);
    
    return taskService.getTaskById(id);
  }
};

// Category operations
export const categoryService = {
  // Get all categories with icons
  getAllCategories: async (): Promise<Category[]> => {
    if (isDevelopment) {
      return dbService.getAllCategories();
    }
    
    const db = getDb();
    return db.prepare('SELECT * FROM categories').all() as Category[];
  },

  // Create or update a category
  saveCategory: async (category: Category): Promise<Category> => {
    if (isDevelopment) {
      return dbService.saveCategory(category);
    }
    
    const db = getDb();
    const existing = db.prepare('SELECT * FROM categories WHERE name = ?').get(category.name);
    
    if (existing) {
      db.prepare('UPDATE categories SET icon = ? WHERE name = ?').run(category.icon, category.name);
    } else {
      db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)').run(category.name, category.icon);
    }
    
    return category;
  },

  // Delete a category
  deleteCategory: async (name: string): Promise<boolean> => {
    if (isDevelopment) {
      await dbService.deleteCategory(name);
      return true;
    }
    
    const db = getDb();
    const result = db.prepare('DELETE FROM categories WHERE name = ?').run(name);
    return result.changes > 0;
  }
}; 