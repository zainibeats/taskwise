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
