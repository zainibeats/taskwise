import { Task } from "@/app/types/task";

// Constants for localStorage keys
const STORAGE_KEYS = {
  TASKS: 'taskwise_tasks',
  CATEGORY_ICONS: 'taskwise_category_icons',
  CUSTOM_CATEGORIES: 'taskwise_custom_categories',
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
 * Retrieves custom categories from localStorage
 * @returns Custom categories object or null if not found
 */
export const getStoredCustomCategories = (): Record<string, string> | null => {
  if (typeof window === 'undefined') return null; // Server-side check
  
  try {
    const storedCustomCategories = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
    console.log('[STORAGE] Retrieving custom categories:', storedCustomCategories);
    
    if (!storedCustomCategories) {
      console.log('[STORAGE] No custom categories found in localStorage');
      return null;
    }
    
    const parsedCategories = JSON.parse(storedCustomCategories);
    console.log('[STORAGE] Parsed custom categories:', parsedCategories);
    return parsedCategories;
  } catch (error) {
    console.error('[STORAGE] Error retrieving custom categories from localStorage:', error);
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
 * Saves custom categories to localStorage
 * @param customCategories Custom categories object to store
 * @param builtInCategories Array of built-in category names to exclude
 * @returns boolean success indicator
 */
export const saveCustomCategories = (
  allCategories: Record<string, string>,
  builtInCategories: string[]
): boolean => {
  if (typeof window === 'undefined') return false; // Server-side check
  
  try {
    console.log('[STORAGE] Saving custom categories. All categories:', allCategories);
    console.log('[STORAGE] Built-in categories:', builtInCategories);
    
    // Filter out built-in categories to only save custom ones
    const customCategories: Record<string, string> = {};
    Object.entries(allCategories).forEach(([category, icon]) => {
      if (!builtInCategories.includes(category)) {
        customCategories[category] = icon;
      }
    });
    
    console.log('[STORAGE] Filtered custom categories to save:', customCategories);
    
    if (Object.keys(customCategories).length === 0) {
      console.log('[STORAGE] No custom categories to save, skipping');
      return true;
    }
    
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(customCategories));
    console.log('[STORAGE] Custom categories saved successfully');
    return true;
  } catch (error) {
    console.error('[STORAGE] Error saving custom categories to localStorage:', error);
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
    // Explicitly remove all storage keys
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing data from localStorage:', error);
    return false;
  }
};
