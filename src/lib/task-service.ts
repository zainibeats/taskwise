import getDbConnection from './db';
// DB row types - will be properly typed during DB consolidation (Task 5)
type DbTask = any;
type DbSubtask = any;
type DbCategory = any;
import { categorizeTask } from '@/ai/flows/categorize-task';
import { prioritizeTask } from '@/ai/flows/prioritize-task';
import { suggestSubtasks } from '@/ai/flows/suggest-subtasks';

// Get database connection
const getDb = () => getDbConnection();

// Task operations
export const taskService = {
  // Get all tasks
  getAllTasks: async (userId?: number): Promise<DbTask[]> => {
    const db = getDb();
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY priority_score DESC').all() as DbTask[];

    // Get subtasks for each task
    return tasks.map(task => {
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(task.id) as DbSubtask[];
      return { ...task, subtasks };
    });
  },

  // Get task by ID
  getTaskById: async (id: number): Promise<DbTask | undefined> => {
    const db = getDb();
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as DbTask | undefined;

    if (!task) return undefined;

    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(task.id) as DbSubtask[];
    return { ...task, subtasks };
  },

  // Create a new task
  createTask: async (task: Omit<DbTask, 'id'>): Promise<DbTask> => {
    const db = getDb();
    const { title, description, deadline, importance, category, priority_score, is_completed = false, subtasks = [] } = task;
    
    // If no category is provided, try to categorize the task using AI
    let taskCategory = category;
    let taskPriorityScore = priority_score;
    
    if (!taskCategory && title) {
      try {
        console.log(`Attempting to categorize task '${title}'`);
        const result = await categorizeTask({
          taskDescription: title + (description ? ` - ${description}` : '')
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
        console.log(`Attempting to prioritize task '${title}'`);
        const result = await prioritizeTask({
          task: title,
          deadline: deadline || '',
          importance: importance || 5,
          category: taskCategory || 'Other'
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
    
    // Insert the task
    const result = db.prepare(`
      INSERT INTO tasks (title, description, deadline, importance, category, priority_score, is_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, deadline, importance, taskCategory, taskPriorityScore, is_completed ? 1 : 0);
    
    const taskId = result.lastInsertRowid as number;
    
    // If no subtasks are provided and we have a title, try to generate them
    if (subtasks.length === 0 && title) {
      try {
        console.log(`Attempting to suggest subtasks for task '${title}'`);
        const result = await suggestSubtasks({
          taskDescription: title + (description ? ` - ${description}` : '')
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
      
      subtasks.forEach((subtask: DbSubtask) => {
        insertSubtask.run(taskId, subtask.description, subtask.is_completed ? 1 : 0);
      });
    }

    const newTask = await taskService.getTaskById(taskId);
    if (!newTask) throw new Error('Failed to create task');
    return newTask;
  },

  // Update an existing task
  updateTask: async (id: number, updates: Partial<DbTask>): Promise<DbTask | undefined> => {
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
        
        subtasks.forEach((subtask: DbSubtask) => {
          insertSubtask.run(id, subtask.description, subtask.is_completed ? 1 : 0);
        });
      }
    }
    
    return taskService.getTaskById(id);
  },

  // Delete a task
  deleteTask: async (id: number): Promise<boolean> => {
    const db = getDb();
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // Toggle task completion
  toggleTaskCompletion: async (id: number): Promise<DbTask | undefined> => {
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
  getAllCategories: async (): Promise<DbCategory[]> => {
    const db = getDb();
    return db.prepare('SELECT * FROM categories').all() as DbCategory[];
  },

  // Create or update a category
  saveCategory: async (category: DbCategory): Promise<DbCategory> => {
    const db = getDb();
    const { name, icon } = category;
    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (existing) {
      db.prepare('UPDATE categories SET icon = ? WHERE name = ?').run(icon, name);
    } else {
      db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)').run(name, icon);
    }
    return category;
  },

  // Delete a category
  deleteCategory: async (name: string): Promise<boolean> => {
    const db = getDb();
    const result = db.prepare('DELETE FROM categories WHERE name = ?').run(name);
    return result.changes > 0;
  }
}; 