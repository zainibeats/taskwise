import { Task } from "@/app/types/task";

// Constants for localStorage keys
const STORAGE_KEYS = {
  TASKS: 'taskwise_tasks',
  CATEGORY_ICONS: 'taskwise_category_icons',
};

/**
 * Retrieves tasks from localStorage
 * @returns Array of tasks or null if not found
 */
export const getStoredTasks = (): Task[] | null => {
  if (typeof window === 'undefined') return null; // Server-side check
  
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!storedTasks) return null;
    
    // Parse and handle date objects properly (JSON.parse converts dates to strings)
    const tasks: Task[] = JSON.parse(storedTasks, (key, value) => {
      // Convert deadline strings back to Date objects
      if (key === 'deadline' && value) {
        return new Date(value);
      }
      return value;
    });
    
    return tasks;
  } catch (error) {
    console.error('Error retrieving tasks from localStorage:', error);
    return null;
  }
};

/**
 * Saves tasks to localStorage
 * @param tasks Tasks array to store
 * @returns boolean success indicator
 */
export const saveTasks = (tasks: Task[]): boolean => {
  if (typeof window === 'undefined') return false; // Server-side check
  
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
    return false;
  }
};

/**
 * Retrieves category icons from localStorage
 * @returns Category icons object or null if not found
 */
export const getStoredCategoryIcons = (): Record<string, string> | null => {
  if (typeof window === 'undefined') return null; // Server-side check
  
  try {
    const storedIcons = localStorage.getItem(STORAGE_KEYS.CATEGORY_ICONS);
    if (!storedIcons) return null;
    
    return JSON.parse(storedIcons);
  } catch (error) {
    console.error('Error retrieving category icons from localStorage:', error);
    return null;
  }
};

/**
 * Saves category icons to localStorage
 * @param icons Category icons object to store
 * @returns boolean success indicator
 */
export const saveCategoryIcons = (icons: Record<string, string>): boolean => {
  if (typeof window === 'undefined') return false; // Server-side check
  
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORY_ICONS, JSON.stringify(icons));
    return true;
  } catch (error) {
    console.error('Error saving category icons to localStorage:', error);
    return false;
  }
};

/**
 * Clears all TaskWise data from localStorage
 * @returns boolean success indicator
 */
export const clearAllData = (): boolean => {
  if (typeof window === 'undefined') return false; // Server-side check
  
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing data from localStorage:', error);
    return false;
  }
};
