import { Task } from "@/app/types/task";
import { Category } from "@/app/types";

// Base URL for API - use environment variable in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

/**
 * Task API client functions
 */
export const TaskApi = {
  /**
   * Get all tasks
   * @returns Array of tasks or empty array if failed
   */
  async getAllTasks(): Promise<Task[]> {
    console.log("[API] Starting getAllTasks...");
    console.log("[API] Using API URL:", `${API_BASE_URL}/api/tasks`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        credentials: 'include', // Include cookies for authentication
      });
      console.log("[API] Response status:", response.status);
      if (!response.ok) {
        console.error("[API] Response not OK:", response.status, response.statusText);
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const tasks = await response.json();
      console.log("[API] Tasks received:", tasks);
      
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
      
      console.log("[API] Mapped tasks:", mappedTasks);
      return mappedTasks;
    } catch (error) {
      console.error('[API] Error fetching tasks:', error);
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

      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
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
      console.error('Error creating task:', error);
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

      const response = await fetch(`${API_BASE_URL}/api/tasks/${parseInt(taskId, 10)}`, {
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
      console.error('Error updating task:', error);
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
      const response = await fetch(`${API_BASE_URL}/api/tasks/${parseInt(taskId, 10)}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
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
      const response = await fetch(`${API_BASE_URL}/api/tasks/${parseInt(taskId, 10)}`, {
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
      console.error('Error toggling task completion:', error);
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
    console.log("[API] Starting getAllCategories...");
    console.log("[API] Using API URL:", `${API_BASE_URL}/api/categories`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        credentials: 'include', // Include cookies for authentication
      });
      console.log("[API] Categories response status:", response.status);
      if (!response.ok) {
        console.error("[API] Categories response not OK:", response.status, response.statusText);
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      
      const categories = await response.json();
      console.log("[API] Categories received:", categories);
      
      // Convert array to object format
      const categoryObj: Record<string, string> = {};
      categories.forEach((category: Category) => {
        categoryObj[category.name] = category.icon;
      });
      
      console.log("[API] Mapped categories:", categoryObj);
      return categoryObj;
    } catch (error) {
      console.error('[API] Error fetching categories:', error);
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
    console.log("[API] Saving category:", name, icon);
    console.log("[API] Using API URL:", `${API_BASE_URL}/api/categories`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, icon }),
        credentials: 'include', // Include cookies for authentication
      });

      console.log("[API] Save category response status:", response.status);
      if (!response.ok) {
        console.error("[API] Save category response not OK:", response.status, response.statusText);
        throw new Error(`Failed to save category: ${response.status}`);
      }

      console.log("[API] Category saved successfully:", name);
      return true;
    } catch (error) {
      console.error('[API] Error saving category:', error);
      return false;
    }
  },

  /**
   * Delete a category
   * @param name Category name
   * @returns Whether deletion was successful
   */
  async deleteCategory(name: string): Promise<boolean> {
    console.log("[API] Deleting category:", name);
    const url = `${API_BASE_URL}/api/categories?name=${encodeURIComponent(name)}`;
    console.log("[API] Using API URL:", url);
    try {
      console.log("[API] Making DELETE request to:", url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });

      console.log("[API] Delete category response:", response);
      console.log("[API] Delete category response status:", response.status);
      
      if (!response.ok) {
        console.error("[API] Delete category response not OK:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("[API] Error response body:", errorText);
        throw new Error(`Failed to delete category: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("[API] Category deleted successfully:", name, "Response:", result);
      return true;
    } catch (error) {
      console.error('[API] Error deleting category:', error);
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
      const response = await fetch(`${API_BASE_URL}/api/user-settings`, {
        credentials: 'include', // Include cookies for authentication
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user settings:', error);
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
      const response = await fetch(`${API_BASE_URL}/api/user-settings/${encodeURIComponent(key)}`, {
        credentials: 'include', // Include cookies for authentication
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Setting not found
        }
        throw new Error(`Failed to fetch setting: ${response.status}`);
      }
      
      const result = await response.json();
      return result.value;
    } catch (error) {
      console.error(`Error fetching setting '${key}':`, error);
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
      const response = await fetch(`${API_BASE_URL}/api/user-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to save setting: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error(`Error saving setting '${key}':`, error);
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
      const response = await fetch(`${API_BASE_URL}/api/user-settings/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to delete setting: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error(`Error deleting setting '${key}':`, error);
      return false;
    }
  }
}; 