export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: number;
  deadline?: Date | undefined;
  subtasks?: Subtask[];
  completed: boolean;
}

export interface Category {
  id?: number;
  name: string;
  icon: string;
  userId?: number;
}

export interface UserSettings {
  id?: number;
  userId: number;
  key: string;
  value?: string;
}
