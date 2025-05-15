import { useCallback } from "react";
import type { Task, Subtask } from "../types/task";
import { TaskApi, UserSettingsApi } from "@/lib/api-client";
import { conditionalToast } from "@/lib/toast-utils";
import { debugLog, debugError } from "@/lib/debug";

interface UseTaskActionsProps {
  tasks: Task[];
  pushHistory: (tasks: Task[]) => void;
  setEditingTaskId: (id: string | null) => void;
  setIsAlertOpen: (open: boolean) => void;
  setTempTask: (task: Task | null) => void;
  toast: (opts: { title: string; description?: string }) => void;
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
  const handleTaskCompletion = useCallback(async (id: string, completed: boolean) => {
    console.log(`[DEBUG] Toggling task completion: ${id} to ${completed}`);
    
    // Optimistically update UI state first
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
    
    // Then update in database
    try {
      // Different approach needed if id is numeric (from database) vs string (local only)
      if (id.startsWith('local-') || id.startsWith('default-')) {
        console.log(`[DEBUG] Local-only task ${id}, not updating in database`);
      } else {
        const numericId = parseInt(id, 10);
        if (!isNaN(numericId)) {
          const updatedTask = await TaskApi.toggleTaskCompletion(id);
          console.log(`[DEBUG] Task completion toggled in database:`, updatedTask);
        }
      }
      conditionalToast({ title: completed ? "Task marked complete" : "Task marked incomplete" }, "task_completion");
    } catch (error) {
      console.error(`[DEBUG] Error toggling task completion in database:`, error);
      toast({ 
        title: "Error updating task", 
        description: "Changes saved locally only" 
      });
    }
  }, [tasks, pushHistory, toast]);

  // Mark subtask complete/incomplete
  const handleSubtaskCompletion = useCallback(async (taskId: string, subtaskId: string, completed: boolean) => {
    // Find the task to update
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;

    // Create updated task with modified subtask
    const updatedTask = {
      ...taskToUpdate,
      subtasks: taskToUpdate.subtasks?.map((subtask: Subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed } : subtask
      ),
    };

    // Optimistically update UI state first
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? updatedTask : task
    );
    pushHistory(updatedTasks);
    
    // Then update in database
    try {
      if (taskId.startsWith('local-') || taskId.startsWith('default-')) {
        console.log(`[DEBUG] Local-only task ${taskId}, not updating subtask in database`);
      } else {
        const numericTaskId = parseInt(taskId, 10);
        if (!isNaN(numericTaskId)) {
          const result = await TaskApi.updateTask(taskId, { 
            subtasks: updatedTask.subtasks 
          });
          console.log(`[DEBUG] Task subtasks updated in database:`, result);
        }
      }
    } catch (error) {
      console.error(`[DEBUG] Error updating subtask in database:`, error);
      // No toast notification for subtask updates to avoid clutter
    }
  }, [tasks, pushHistory]);

  // Update a task
  const handleUpdateTask = useCallback(async (id: string, updatedTaskPartial: Partial<Task>) => {
    // Optimistically update UI state first
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, ...updatedTaskPartial } : task
    );
    pushHistory(updatedTasks);
    setEditingTaskId(null);
    
    // Then update in database
    try {
      if (id.startsWith('local-') || id.startsWith('default-')) {
        console.log(`[DEBUG] Local-only task ${id}, not updating in database`);
      } else {
        const numericId = parseInt(id, 10);
        if (!isNaN(numericId)) {
          const result = await TaskApi.updateTask(id, updatedTaskPartial);
          console.log(`[DEBUG] Task updated in database:`, result);
        }
      }
      conditionalToast({ title: "Task updated" }, "update_task");
    } catch (error) {
      console.error(`[DEBUG] Error updating task in database:`, error);
      toast({ 
        title: "Task updated",
        description: "Changes saved locally only" 
      });
    }
  }, [tasks, pushHistory, setEditingTaskId, toast]);

  // Delete a task
  const handleDeleteTask = useCallback(async (id: string) => {
    // Optimistically update UI state first
    const updatedTasks = tasks.filter((task) => task.id !== id);
    pushHistory(updatedTasks);
    
    // Check if this is the default task being deleted
    if (id === "default-1") {
      debugLog("Default task being deleted, saving this preference");
      try {
        // Mark that the default task has been deleted so it won't appear again after logout
        await UserSettingsApi.saveSetting('defaultTaskDeleted', 'true');
        debugLog("Marked default task as deleted in user settings");
      } catch (settingError) {
        debugError("Error saving default task deletion setting:", settingError);
      }
    }
    
    // Then delete from database
    try {
      if (id.startsWith('local-') || id.startsWith('default-')) {
        debugLog(`Local-only task ${id}, not deleting from database`);
      } else {
        const numericId = parseInt(id, 10);
        if (!isNaN(numericId)) {
          const success = await TaskApi.deleteTask(id);
          debugLog(`Task deleted from database: ${success}`);
        }
      }
      conditionalToast({ title: "Task deleted" }, "delete_task");
    } catch (error) {
      debugError(`Error deleting task from database:`, error);
      toast({ 
        title: "Task deleted locally",
        description: "Could not delete from database" 
      });
    }
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
