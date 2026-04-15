type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const API_BASE_URL = typeof window !== 'undefined'
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100/api');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: { method?: HttpMethod; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', body } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API ${method} ${path} failed: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// --- Snake/Camel conversion helpers ---

interface DbTask {
  id: number;
  title: string;
  description?: string;
  deadline?: string;
  importance?: number;
  category?: string;
  priority_score?: number;
  is_completed: boolean;
  created_at?: string;
  subtasks?: DbSubtask[];
}

interface DbSubtask {
  id: number;
  task_id: number;
  description: string;
  is_completed: boolean;
}

import type { Task, Subtask } from '@/app/types/task';

export function dbTaskToFrontend(raw: DbTask): Task {
  return {
    ...raw,
    id: String(raw.id),
    subtasks: raw.subtasks?.map(dbSubtaskToFrontend) ?? [],
    deadline: raw.deadline ? new Date(raw.deadline) : undefined,
    completed: raw.is_completed,
    priority: raw.priority_score,
  };
}

function dbSubtaskToFrontend(raw: DbSubtask): Subtask {
  return {
    id: String(raw.id),
    title: raw.description,
    completed: raw.is_completed,
  };
}

export function frontendTaskToDb(task: Partial<Task>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (task.title !== undefined) result.title = task.title;
  if (task.description !== undefined) result.description = task.description;
  if (task.deadline !== undefined) result.deadline = task.deadline?.toISOString();
  if (task.category !== undefined) result.category = task.category;
  if (task.priority !== undefined) result.priority_score = task.priority;
  if (task.completed !== undefined) result.is_completed = task.completed;
  if (task.subtasks !== undefined) {
    result.subtasks = task.subtasks.map((s) => ({
      description: s.title,
      is_completed: s.completed || false,
    }));
  }
  return result;
}
