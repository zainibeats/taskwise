"use client";

import React from "react";
import type { Task } from "@/app/types/task";
import { TaskCard } from "@/components/task-card";

interface TaskCardListProps {
  tasks: Task[];
  isLoading: boolean;
  editingTaskId: string | null;
  categoryIcons: Record<string, string>;
  onTaskCompletion: (id: string, completed: boolean) => void;
  onSubtaskCompletion: (taskId: string, subtaskId: string, completed: boolean) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onCancelEdit: () => void;
  setCategoryIcons: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isCreateCategoryOpen: boolean;
  setIsCreateCategoryOpen: (open: boolean) => void;
  onCreateCategory: (category: string, emoji: string) => void;
}

export function TaskCardList({
  tasks,
  isLoading,
  editingTaskId,
  categoryIcons,
  onTaskCompletion,
  onSubtaskCompletion,
  onEditTask,
  onUpdateTask,
  onDeleteTask,
  onCancelEdit,
  setCategoryIcons,
  isCreateCategoryOpen,
  setIsCreateCategoryOpen,
  onCreateCategory,
}: TaskCardListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-2">Loading tasks...</span>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No tasks yet. Create your first task above!</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 mt-4">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            isEditing={editingTaskId === task.id}
            categoryIcons={categoryIcons}
            onTaskCompletion={onTaskCompletion}
            onSubtaskCompletion={onSubtaskCompletion}
            onEditTask={onEditTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onCancelEdit={onCancelEdit}
            setCategoryIcons={setCategoryIcons}
            isCreateCategoryOpen={isCreateCategoryOpen}
            setIsCreateCategoryOpen={setIsCreateCategoryOpen}
            onCreateCategory={onCreateCategory}
          />
        </li>
      ))}
    </ul>
  );
}
