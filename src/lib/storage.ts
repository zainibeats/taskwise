import { Task } from "@/app/types/task";
import { TaskApi, CategoryApi } from "./api-client";
import { debugError } from "./debug";

// This file now acts as a redirect to the database API
// No localStorage is used anywhere in this file
// The application uses the API client directly for most operations
// Only a few utility functions remain here for backward compatibility

/**
 * Retrieves tasks from the database API
 * @returns Array of tasks or null if not found
 */
export const getStoredTasks = async (): Promise<Task[] | null> => {
  try {
    const tasks = await TaskApi.getAllTasks();
    return tasks.length > 0 ? tasks : null;
  } catch (error) {
    debugError('Error retrieving tasks from database:', error);
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
    debugError('Error saving tasks to database:', error);
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
    debugError('Error clearing data from database:', error);
    return false;
  }
};
