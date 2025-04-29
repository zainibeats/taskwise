import getDbConnection, { dbService } from './db';
import { Task, Subtask, Category } from '../app/types';
import { categorizeTask } from '@/ai/flows/categorize-task';
import { prioritizeTask } from '@/ai/flows/prioritize-task';
import { suggestSubtasks } from '@/ai/flows/suggest-subtasks';

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
  createTask: async (task: Omit<Task, 'id'>, userId?: number): Promise<Task> => {
    if (isDevelopment) {
      return dbService.createTask(task, userId);
    }
    
    const db = getDb();
    const { title, description, deadline, importance, category, priority_score, is_completed = false, subtasks = [] } = task;
    
    // If no category is provided, try to categorize the task using AI
    let taskCategory = category;
    let taskPriorityScore = priority_score;
    
    if (!taskCategory && title) {
      try {
        console.log(`Attempting to categorize task '${title}' with user ID: ${userId || 'none'}`);
        const result = await categorizeTask({ 
          taskDescription: title + (description ? ` - ${description}` : ''),
          userId 
        });
        taskCategory = result.category;
      } catch (error) {
        console.error('Error categorizing task:', error);
        taskCategory = 'Other'; // Default to 'Other' if categorization fails
      }
    }
    
    // If no priority score is provided, calculate it using AI
    if (!taskPriorityScore && title) {
      try {
        console.log(`Attempting to prioritize task '${title}' with user ID: ${userId || 'none'}`);
        const result = await prioritizeTask({
          task: title,
          deadline: deadline || '',
          importance: importance || 5,
          category: taskCategory || 'Other',
          userId
        });
        taskPriorityScore = result.priorityScore;
        console.log(`Successfully prioritized task with score: ${taskPriorityScore}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Check for specific error messages that might indicate API key problems
        if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key') || errorMsg.includes('authentication')) {
          console.error('API key error when prioritizing task:', errorMsg);
          // Will fall back to default priority below
        } else {
          console.error('Error prioritizing task:', error);
        }
        taskPriorityScore = 50; // Default to medium priority if prioritization fails
      }
    }
    
    // Insert the task with user ID
    const result = db.prepare(`
      INSERT INTO tasks (title, description, deadline, importance, category, priority_score, is_completed, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, deadline, importance, taskCategory, taskPriorityScore, is_completed ? 1 : 0, userId || null);
    
    const taskId = result.lastInsertRowid as number;
    
    // If no subtasks are provided and we have a title, try to generate them
    if (subtasks.length === 0 && title) {
      try {
        console.log(`Attempting to suggest subtasks for task '${title}' with user ID: ${userId || 'none'}`);
        const result = await suggestSubtasks({
          taskDescription: title + (description ? ` - ${description}` : ''),
          userId
        });
        
        if (result.subtasks && result.subtasks.length > 0) {
          const insertSubtask = db.prepare('INSERT INTO subtasks (task_id, description, is_completed) VALUES (?, ?, ?)');
          
          result.subtasks.forEach((subtaskText) => {
            insertSubtask.run(taskId, subtaskText, 0);
          });
        }
      } catch (error) {
        console.error('Error generating subtasks:', error);
        // Continue without subtasks if generation fails
      }
    } else if (subtasks.length > 0) {
      // Add provided subtasks if any
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
  getAllCategories: async (userId?: number): Promise<Category[]> => {
    if (isDevelopment) {
      return dbService.getAllCategories(userId);
    }
    
    const db = getDb();
    if (userId) {
      return db.prepare('SELECT * FROM categories WHERE user_id = ? OR user_id IS NULL').all(userId) as Category[];
    } else {
      return db.prepare('SELECT * FROM categories').all() as Category[];
    }
  },

  // Create or update a category
  saveCategory: async (category: Category): Promise<Category> => {
    if (isDevelopment) {
      return dbService.saveCategory(category);
    }
    
    const db = getDb();
    const { name, icon, user_id } = category;
    
    // Check if a category with this name already exists for this user
    const existing = db.prepare('SELECT * FROM categories WHERE name = ? AND (user_id = ? OR user_id IS NULL)').get(name, user_id) as { user_id: number | null } | undefined;
    
    if (existing) {
      // If it's a built-in category (user_id is NULL), create a user-specific override
      if (existing.user_id === null) {
        db.prepare('INSERT INTO categories (name, icon, user_id) VALUES (?, ?, ?)').run(name, icon, user_id);
      } else {
        // Otherwise, update the existing user-specific category
        db.prepare('UPDATE categories SET icon = ? WHERE name = ? AND user_id = ?').run(icon, name, user_id);
      }
    } else {
      // Create a new user-specific category
      db.prepare('INSERT INTO categories (name, icon, user_id) VALUES (?, ?, ?)').run(name, icon, user_id);
    }
    
    return category;
  },

  // Delete a category
  deleteCategory: async (name: string, userId?: number): Promise<boolean> => {
    if (isDevelopment) {
      return dbService.deleteCategory(name, userId);
    }
    
    const db = getDb();
    
    // Only allow deleting user-specific categories, not built-in ones
    if (userId) {
      const result = db.prepare('DELETE FROM categories WHERE name = ? AND user_id = ?').run(name, userId);
      return result.changes > 0;
    } else {
      const result = db.prepare('DELETE FROM categories WHERE name = ?').run(name);
      return result.changes > 0; 
    }
  }
}; 