import { Task } from "@/app/types/task";
import { Category } from "@/app/types";
import { debugLog, debugError } from "./debug";

// Base URL for API 
// In browser, use relative paths for better HTTPS compatibility
// In Node.js environment, use environment variable or default
const API_BASE_URL = typeof window !== 'undefined' 
  ? '/api' // Use relative path in browser for better HTTPS compatibility
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100/api');

/**
 * Task API client functions
 */
export const TaskApi = {
  /**
   * Get all tasks
   * @returns Array of tasks or empty array if failed
   */
  async getAllTasks(): Promise<Task[]> {
    debugLog("Starting getAllTasks...");
    const apiUrl = typeof window !== 'undefined' ? `${API_BASE_URL}/tasks` : `${API_BASE_URL}/tasks`;
    debugLog("Using API URL:", apiUrl);
    try {
      const response = await fetch(apiUrl, {
        credentials: 'include', // Include cookies for authentication
      });
      debugLog("Response status:", response.status);
      if (!response.ok) {
        debugError("Response not OK:", response.status, response.statusText);
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const tasks = await response.json();
      debugLog("Tasks received:", tasks);
      
      // Convert task IDs from number to string for frontend compatibility
      const mappedTasks = tasks.map((task: any) => ({
        ...task,
        id: String(task.id),
        subtasks: task.subtasks?.map((subtask: any) => ({
          ...subtask,
          id: String(subtask.id),
          task_id: String(subtask.task_id),
          title: subtask.description, // Map description to title for frontend
          completed: subtask.is_completed // Map is_completed to completed for frontend
        })) || [],
        deadline: task.deadline ? new Date(task.deadline) : undefined,
        completed: task.is_completed, // Map is_completed to completed for frontend
        priority: task.priority_score // Map priority_score to priority for frontend
      }));
      
      debugLog("Mapped tasks:", mappedTasks);
      return mappedTasks;
    } catch (error) {
      debugError('Error fetching tasks:', error);
      return [];
    }
  },

  /**
   * Create a new task
   * @param task Task to create
   * @returns Created task or null if failed
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task | null> {
    try {
      // Convert frontend task format to API format
      const apiTask = {
        title: task.title,
        description: task.description,
        deadline: task.deadline?.toISOString(),
        category: task.category,
        priority_score: task.priority || 50, // Default priority if not provided
        is_completed: task.completed || false,
        subtasks: task.subtasks?.map(subtask => ({
          description: subtask.title,
          is_completed: subtask.completed || false
        })) || []
      };

      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiTask),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`);
      }

      const createdTask = await response.json();
      
      // Convert to frontend format
      return {
        ...createdTask,
        id: String(createdTask.id),
        subtasks: createdTask.subtasks?.map((subtask: any) => ({
          id: String(subtask.id),
          task_id: String(subtask.task_id),
          title: subtask.description,
          completed: subtask.is_completed
        })) || [],
        deadline: createdTask.deadline ? new Date(createdTask.deadline) : undefined,
        completed: createdTask.is_completed,
        priority: createdTask.priority_score
      };
    } catch (error) {
      debugError('Error creating task:', error);
      return null;
    }
  },

  /**
   * Update an existing task
   * @param taskId Task ID
   * @param updates Task updates
   * @returns Updated task or null if failed
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      // Convert frontend updates to API format
      const apiUpdates: any = {};
      
      if (updates.title !== undefined) apiUpdates.title = updates.title;
      if (updates.description !== undefined) apiUpdates.description = updates.description;
      if (updates.deadline !== undefined) apiUpdates.deadline = updates.deadline?.toISOString();
      if (updates.category !== undefined) apiUpdates.category = updates.category;
      if (updates.priority !== undefined) apiUpdates.priority_score = updates.priority;
      if (updates.completed !== undefined) apiUpdates.is_completed = updates.completed;
      
      if (updates.subtasks !== undefined) {
        apiUpdates.subtasks = updates.subtasks.map(subtask => ({
          description: subtask.title,
          is_completed: subtask.completed
        }));
      }

      const response = await fetch(`${API_BASE_URL}/tasks/${parseInt(taskId, 10)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiUpdates),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
      }

      const updatedTask = await response.json();
      
      // Convert to frontend format
      return {
        ...updatedTask,
        id: String(updatedTask.id),
        subtasks: updatedTask.subtasks?.map((subtask: any) => ({
          id: String(subtask.id),
          task_id: String(subtask.task_id),
          title: subtask.description,
          completed: subtask.is_completed
        })) || [],
        deadline: updatedTask.deadline ? new Date(updatedTask.deadline) : undefined,
        completed: updatedTask.is_completed,
        priority: updatedTask.priority_score
      };
    } catch (error) {
      debugError('Error updating task:', error);
      return null;
    }
  },

  /**
   * Delete a task
   * @param taskId Task ID
   * @returns Whether deletion was successful
   */
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${parseInt(taskId, 10)}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
      }

      return true;
    } catch (error) {
      debugError('Error deleting task:', error);
      return false;
    }
  },

  /**
   * Toggle task completion
   * @param taskId Task ID
   * @returns Updated task or null if failed
   */
  async toggleTaskCompletion(taskId: string): Promise<Task | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${parseInt(taskId, 10)}`, {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle task completion: ${response.status}`);
      }

      const updatedTask = await response.json();
      
      // Convert to frontend format
      return {
        ...updatedTask,
        id: String(updatedTask.id),
        subtasks: updatedTask.subtasks?.map((subtask: any) => ({
          id: String(subtask.id),
          task_id: String(subtask.task_id),
          title: subtask.description,
          completed: subtask.is_completed
        })) || [],
        deadline: updatedTask.deadline ? new Date(updatedTask.deadline) : undefined,
        completed: updatedTask.is_completed,
        priority: updatedTask.priority_score
      };
    } catch (error) {
      debugError('Error in toggleTaskCompletion:', error);
      return null;
    }
  }
};

/**
 * Category API client functions
 */
export const CategoryApi = {
  /**
   * Get all categories
   * @returns Object with category names and icons
   */
  async getAllCategories(): Promise<Record<string, string>> {
    debugLog("Starting getAllCategories...");
    debugLog("Using API URL:", `${API_BASE_URL}/categories`);
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        credentials: 'include', // Include cookies for authentication
      });
      debugLog("Categories response status:", response.status);
      if (!response.ok) {
        debugError("Categories response not OK:", response.status, response.statusText);
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      
      const categories = await response.json();
      debugLog("Categories received:", categories);
      
      // Convert array to object format
      const categoryObj: Record<string, string> = {};
      categories.forEach((category: Category) => {
        categoryObj[category.name] = category.icon;
      });
      
      debugLog("Mapped categories:", categoryObj);
      return categoryObj;
    } catch (error) {
      debugError('Error fetching categories:', error);
      return {};
    }
  },

  /**
   * Save a category
   * @param name Category name
   * @param icon Category icon
   * @returns Whether save was successful
   */
  async saveCategory(name: string, icon: string): Promise<boolean> {
    debugLog("Saving category:", name, icon);
    debugLog("Using API URL:", `${API_BASE_URL}/categories`);
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, icon }),
        credentials: 'include', // Include cookies for authentication
      });

      debugLog("Save category response status:", response.status);
      if (!response.ok) {
        debugError("Save category response not OK:", response.status, response.statusText);
        throw new Error(`Failed to save category: ${response.status}`);
      }

      debugLog("Category saved successfully:", name);
      return true;
    } catch (error) {
      debugError('Error saving category:', error);
      return false;
    }
  },

  /**
   * Delete a category
   * @param name Category name
   * @returns Whether deletion was successful
   */
  async deleteCategory(name: string): Promise<boolean> {
    debugLog("Deleting category:", name);
    const url = `${API_BASE_URL}/categories?name=${encodeURIComponent(name)}`;
    debugLog("Using API URL:", url);
    try {
      debugLog("Making DELETE request to:", url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });

      debugLog("Delete category response:", response);
      debugLog("Delete category response status:", response.status);
      
      if (!response.ok) {
        debugError("Delete category response not OK:", response.status, response.statusText);
        const errorText = await response.text();
        debugError("Error response body:", errorText);
        throw new Error(`Failed to delete category: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      debugLog("Category deleted successfully:", name, "Response:", result);
      return true;
    } catch (error) {
      debugError('Error deleting category:', error);
      return false;
    }
  }
};

/**
 * User Settings API client functions
 */
export const UserSettingsApi = {
  /**
   * Get all user settings
   * @returns Object with settings or empty object if failed
   */
  async getAllSettings(): Promise<Record<string, string>> {
    try {
      debugLog("Fetching all user settings");
      const response = await fetch(`${API_BASE_URL}/user-settings`, {
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          debugError("Authentication error fetching settings - not logged in");
          return {};
        }
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }
      
      const data = await response.json();
      debugLog(`Got ${Object.keys(data).length} settings`);
      return data;
    } catch (error) {
      debugError('Error fetching user settings:', error);
      return {};
    }
  },

  /**
   * Get a specific setting
   * @param key Setting key
   * @returns Setting value or null if not found
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      debugLog(`Fetching setting: ${key}`);
      const response = await fetch(`${API_BASE_URL}/user-settings/${encodeURIComponent(key)}`, {
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          debugLog(`Setting not found: ${key}`);
          return null; // Setting not found
        }
        if (response.status === 401) {
          debugError(`Authentication error fetching setting: ${key} - not logged in`);
          return null;
        }
        throw new Error(`Failed to fetch setting: ${response.status}`);
      }
      
      const result = await response.json();
      debugLog(`Got setting ${key}, value length: ${result.value?.length || 0}`);
      return result.value;
    } catch (error) {
      debugError(`Error fetching setting '${key}':`, error);
      return null;
    }
  },

  /**
   * Save a setting
   * @param key Setting key
   * @param value Setting value
   * @returns Success indicator
   */
  async saveSetting(key: string, value: string): Promise<boolean> {
    try {
      debugLog(`Saving setting: ${key}, value length: ${value?.length || 0}`);
      const response = await fetch(`${API_BASE_URL}/user-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        if (response.status === 401) {
          debugError(`Authentication error saving setting: ${key} - not logged in`);
          return false;
        }
        
        const errorText = await response.text();
        console.error(`Error response from server (${response.status}):`, errorText);
        throw new Error(`Failed to save setting: ${response.status}`);
      }

      debugLog(`Successfully saved setting: ${key}`);
      return true;
    } catch (error) {
      debugError(`Error saving setting '${key}':`, error);
      return false;
    }
  },

  /**
   * Delete a setting
   * @param key Setting key
   * @returns Success indicator
   */
  async deleteSetting(key: string): Promise<boolean> {
    try {
      debugLog(`Deleting setting: ${key}`);
      const response = await fetch(`${API_BASE_URL}/user-settings/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error(`Authentication error deleting setting: ${key} - not logged in`);
          return false;
        }
        throw new Error(`Failed to delete setting: ${response.status}`);
      }

      debugLog(`Successfully deleted setting: ${key}`);
      return true;
    } catch (error) {
      debugError(`Error deleting setting '${key}':`, error);
      return false;
    }
  }
}; 