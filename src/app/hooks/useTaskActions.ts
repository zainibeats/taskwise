import { useCallback } from "react";
import type { Task, Subtask } from "../types/task";

interface UseTaskActionsProps {
  tasks: Task[];
  pushHistory: (tasks: Task[]) => void;
  setEditingTaskId: (id: string | null) => void;
  setIsAlertOpen: (open: boolean) => void;
  setTempTask: (task: Task | null) => void;
  toast: (opts: { title: string }) => void;
}

export function useTaskActions({
  tasks,
  pushHistory,
  setEditingTaskId,
  setIsAlertOpen,
  setTempTask,
  toast,
}: UseTaskActionsProps) {
  // Mark task complete/incomplete
  const handleTaskCompletion = useCallback((id: string, completed: boolean) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === id) {
        const updatedTask = { ...task, completed };
        if (updatedTask.subtasks) {
          updatedTask.subtasks = updatedTask.subtasks.map((subtask: Subtask) => ({
            ...subtask,
            completed,
          }));
        }
        return updatedTask;
      }
      return task;
    });
    pushHistory(updatedTasks);
    toast({ title: completed ? "Task marked complete" : "Task marked incomplete" });
  }, [tasks, pushHistory, toast]);

  // Mark subtask complete/incomplete
  const handleSubtaskCompletion = useCallback((taskId: string, subtaskId: string, completed: boolean) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks?.map((subtask: Subtask) =>
            subtask.id === subtaskId ? { ...subtask, completed } : subtask
          ),
        };
      }
      return task;
    });
    pushHistory(updatedTasks);
  }, [tasks, pushHistory]);

  // Update a task
  const handleUpdateTask = useCallback((id: string, updatedTaskPartial: Partial<Task>) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, ...updatedTaskPartial } : task
    );
    pushHistory(updatedTasks);
    setEditingTaskId(null);
    toast({ title: "Task updated" });
  }, [tasks, pushHistory, setEditingTaskId, toast]);

  // Delete a task
  const handleDeleteTask = useCallback((id: string) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    pushHistory(updatedTasks);
    toast({ title: "Task deleted" });
  }, [tasks, pushHistory, toast]);

  // Edit a task
  const handleEditTask = useCallback((task: Task) => {
    if (task.id) {
      setEditingTaskId(task.id);
    }
  }, [setEditingTaskId]);

  // Alert dialog for editing (confirm/cancel discard)
  const confirmDiscard = useCallback((tempTask: Task | null) => {
    setEditingTaskId(tempTask?.id || null);
    setIsAlertOpen(false);
    setTempTask(null);
  }, [setEditingTaskId, setIsAlertOpen, setTempTask]);

  const cancelDiscard = useCallback(() => {
    setIsAlertOpen(false);
    setTempTask(null);
  }, [setIsAlertOpen, setTempTask]);

  return {
    handleTaskCompletion,
    handleSubtaskCompletion,
    handleUpdateTask,
    handleDeleteTask,
    handleEditTask,
    confirmDiscard,
    cancelDiscard,
  };
}
