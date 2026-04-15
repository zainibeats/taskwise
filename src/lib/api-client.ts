import type { Task } from '@/app/types/task';
import { apiFetch, dbTaskToFrontend, frontendTaskToDb } from './api-fetch';

export const TaskApi = {
  async getAllTasks(): Promise<Task[]> {
    const raw = await apiFetch<any[]>('/tasks');
    return raw.map(dbTaskToFrontend);
  },

  async createTask(task: Omit<Task, 'id'>): Promise<Task | null> {
    try {
      const raw = await apiFetch<any>('/tasks', {
        method: 'POST',
        body: frontendTaskToDb(task as Partial<Task>),
      });
      return dbTaskToFrontend(raw);
    } catch {
      return null;
    }
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      const raw = await apiFetch<any>(`/tasks/${parseInt(taskId, 10)}`, {
        method: 'PUT',
        body: frontendTaskToDb(updates),
      });
      return dbTaskToFrontend(raw);
    } catch {
      return null;
    }
  },

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await apiFetch(`/tasks/${parseInt(taskId, 10)}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  },

  async toggleTaskCompletion(taskId: string): Promise<Task | null> {
    try {
      const raw = await apiFetch<any>(`/tasks/${parseInt(taskId, 10)}`, { method: 'PATCH' });
      return dbTaskToFrontend(raw);
    } catch {
      return null;
    }
  },
};

export const CategoryApi = {
  async getAllCategories(): Promise<Record<string, string>> {
    try {
      const categories = await apiFetch<{ name: string; icon: string }[]>('/categories');
      const result: Record<string, string> = {};
      categories.forEach((c) => { result[c.name] = c.icon; });
      return result;
    } catch {
      return {};
    }
  },

  async saveCategory(name: string, icon: string): Promise<boolean> {
    try {
      await apiFetch('/categories', { method: 'POST', body: { name, icon } });
      return true;
    } catch {
      return false;
    }
  },

  async deleteCategory(name: string): Promise<boolean> {
    try {
      await apiFetch(`/categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  },
};

export const UserSettingsApi = {
  async getAllSettings(): Promise<Record<string, string>> {
    try {
      return await apiFetch<Record<string, string>>('/user-settings');
    } catch {
      return {};
    }
  },

  async getSetting(key: string): Promise<string | null> {
    try {
      const result = await apiFetch<{ value: string }>(`/user-settings/${encodeURIComponent(key)}`);
      return result.value;
    } catch {
      return null;
    }
  },

  async saveSetting(key: string, value: string): Promise<boolean> {
    try {
      await apiFetch('/user-settings', { method: 'POST', body: { key, value } });
      return true;
    } catch {
      return false;
    }
  },

  async deleteSetting(key: string): Promise<boolean> {
    try {
      await apiFetch(`/user-settings/${encodeURIComponent(key)}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  },
};
