import { useState, useEffect } from 'react';
import { Task } from '../types/task';

// Use relative path for better HTTPS compatibility
const API_BASE_URL = '/api';

export default function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tasks
  const fetchTasks = async () => {
    const apiUrl = `${API_BASE_URL}/tasks`;
    console.log('[useTasks] Fetching tasks from:', apiUrl);
    setLoading(true);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      console.log('[useTasks] Received tasks:', data);
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('[useTasks] Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Create a new task
  const createTask = async (taskData: Omit<Task, 'id'>) => {
    const apiUrl = `${API_BASE_URL}/tasks`;
    console.log('[useTasks] Creating task at:', apiUrl, taskData);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();
      console.log('[useTasks] Task created:', newTask);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      console.error('[useTasks] Error creating task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Update a task
  const updateTask = async (id: number, updates: Partial<Task>) => {
    const apiUrl = `${API_BASE_URL}/tasks/${id}`;
    console.log('[useTasks] Updating task at:', apiUrl, updates);
    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      console.log('[useTasks] Task updated:', updatedTask);
      setTasks(prev => prev.map(task => (task.id === id ? updatedTask : task)));
      return updatedTask;
    } catch (err) {
      console.error('[useTasks] Error updating task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Delete a task
  const deleteTask = async (id: number) => {
    const apiUrl = `${API_BASE_URL}/tasks/${id}`;
    console.log('[useTasks] Deleting task at:', apiUrl);
    try {
      const response = await fetch(apiUrl, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      console.log('[useTasks] Task deleted successfully');
      setTasks(prev => prev.filter(task => task.id !== id));
      return true;
    } catch (err) {
      console.error('[useTasks] Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Toggle task completion
  const toggleTaskCompletion = async (id: number) => {
    const apiUrl = `${API_BASE_URL}/tasks/${id}`;
    console.log('[useTasks] Toggling task completion at:', apiUrl);
    try {
      const response = await fetch(apiUrl, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle task completion');
      }

      const updatedTask = await response.json();
      console.log('[useTasks] Task completion toggled:', updatedTask);
      setTasks(prev => prev.map(task => (task.id === id ? updatedTask : task)));
      return updatedTask;
    } catch (err) {
      console.error('[useTasks] Error toggling task completion:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Load tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
  };
} 