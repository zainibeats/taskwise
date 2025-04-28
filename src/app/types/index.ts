export interface Task {
  id: number;
  title: string;
  description?: string;
  deadline?: string;
  importance: number;
  category: string;
  priority_score: number;
  is_completed: boolean;
  created_at?: string;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: number;
  task_id: number;
  description: string;
  is_completed: boolean;
}

export interface Category {
  id?: number;
  name: string;
  icon: string;
  user_id?: number;
} 