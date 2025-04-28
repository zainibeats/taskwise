import { Task } from "@/app/types/task";
import { TaskApi, CategoryApi } from "./api-client";

// This file now acts as a redirect to the database API
// No localStorage is used anywhere in this file

/**
 * Retrieves tasks from the database API
 * @returns Array of tasks or null if not found
 */
export const getStoredTasks = async (): Promise<Task[] | null> => {
  try {
    const tasks = await TaskApi.getAllTasks();
    return tasks.length > 0 ? tasks : null;
  } catch (error) {
    console.error('Error retrieving tasks from database:', error);
    return null;
  }
};

/**
 * Saves tasks to the database
 * @param tasks Tasks array to store
 * @returns boolean success indicator
 */
export const saveTasks = async (tasks: Task[]): Promise<boolean> => {
  try {
    // Create or update each task in the database
    for (const task of tasks) {
      if (task.id && !task.id.startsWith('local-') && !task.id.startsWith('default-')) {
        // Update existing task
        await TaskApi.updateTask(task.id, task);
      } else {
        // Create new task
        const { id, ...taskWithoutId } = task;
        await TaskApi.createTask(taskWithoutId);
      }
    }
    return true;
  } catch (error) {
    console.error('Error saving tasks to database:', error);
    return false;
  }
};

/**
 * Retrieves category icons from the database
 * @returns Category icons object or null if not found
 */
export const getStoredCategoryIcons = async (): Promise<Record<string, string> | null> => {
  try {
    const categories = await CategoryApi.getAllCategories();
    return Object.keys(categories).length > 0 ? categories : null;
  } catch (error) {
    console.error('Error retrieving category icons from database:', error);
    return null;
  }
};

/**
 * Retrieves custom categories from the database
 * @returns Custom categories object or null if not found
 */
export const getStoredCustomCategories = async (): Promise<Record<string, string> | null> => {
  try {
    const allCategories = await CategoryApi.getAllCategories();
    // Filter to only get custom categories (those not in the built-in list)
    const builtInCategories = [
      "Work", "Home", "Errands", "Personal", "Health", 
      "Finance", "Education", "Social", "Travel", "Other"
    ];
    
    const customCategories: Record<string, string> = {};
    Object.entries(allCategories).forEach(([category, icon]) => {
      if (!builtInCategories.includes(category)) {
        customCategories[category] = icon;
      }
    });
    
    return Object.keys(customCategories).length > 0 ? customCategories : null;
  } catch (error) {
    console.error('Error retrieving custom categories from database:', error);
    return null;
  }
};

/**
 * Saves category icons to the database
 * @param icons Category icons object to store
 * @returns boolean success indicator
 */
export const saveCategoryIcons = async (icons: Record<string, string>): Promise<boolean> => {
  try {
    // Save each category and its icon
    for (const [category, icon] of Object.entries(icons)) {
      await CategoryApi.saveCategory(category, icon);
    }
    return true;
  } catch (error) {
    console.error('Error saving category icons to database:', error);
    return false;
  }
};

/**
 * Saves custom categories to the database
 * @param allCategories All categories object to store
 * @param builtInCategories Array of built-in category names to exclude
 * @returns boolean success indicator
 */
export const saveCustomCategories = async (
  allCategories: Record<string, string>,
  builtInCategories: string[]
): Promise<boolean> => {
  try {
    // Filter out built-in categories to only save custom ones
    const customCategories: Record<string, string> = {};
    Object.entries(allCategories).forEach(([category, icon]) => {
      if (!builtInCategories.includes(category)) {
        customCategories[category] = icon;
      }
    });
    
    // Save each custom category
    for (const [category, icon] of Object.entries(customCategories)) {
      await CategoryApi.saveCategory(category, icon);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving custom categories to database:', error);
    return false;
  }
};

/**
 * Clears all TaskWise data from the database for the current user
 * Note: This should be implemented with caution as it's a destructive operation
 * @returns boolean success indicator
 */
export const clearAllData = async (): Promise<boolean> => {
  try {
    // Delete all tasks
    const tasks = await TaskApi.getAllTasks();
    for (const task of tasks) {
      await TaskApi.deleteTask(task.id);
    }
    
    // Custom categories (non-built-in) should be deleted as well
    const allCategories = await CategoryApi.getAllCategories();
    const builtInCategories = [
      "Work", "Home", "Errands", "Personal", "Health", 
      "Finance", "Education", "Social", "Travel", "Other"
    ];
    
    for (const category of Object.keys(allCategories)) {
      if (!builtInCategories.includes(category)) {
        await CategoryApi.deleteCategory(category);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing data from database:', error);
    return false;
  }
};
