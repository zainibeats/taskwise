import { useCallback, useEffect } from "react";
import { conditionalToast } from "@/lib/toast-utils";

export interface UseUndoRedoOptions<T> {
  history: T[][];
  setHistory: React.Dispatch<React.SetStateAction<T[][]>>;
  historyIndex: number;
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  toast?: (opts: { title: string }) => void;
}

export function useUndoRedo<T>({
  history,
  setHistory,
  historyIndex,
  setHistoryIndex,
  toast,
}: UseUndoRedoOptions<T>) {
  // Derive current tasks from history
  const tasks = history[historyIndex];

  // Calculate canUndo/canRedo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Helper to push state to history
  const pushHistory = useCallback((newTasksState: T[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newTasksState]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex, setHistory, setHistoryIndex]);

  // --- Undo/Redo Handlers ---
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      toast && conditionalToast({ title: "Undo performed" }, "undo");
    }
  }, [historyIndex, setHistoryIndex, toast]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      toast && conditionalToast({ title: "Redo performed" }, "redo");
    }
  }, [historyIndex, history.length, setHistoryIndex, toast]);

  // --- Keyboard Shortcut Effect ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Redo: Ctrl+Shift+Z (or Cmd+Shift+Z)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
        if (canRedo) {
          event.preventDefault();
          handleRedo();
        }
        return;
      }
      // Undo: Ctrl+Z (or Cmd+Z) without Shift
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
        if (canUndo) {
          event.preventDefault();
          handleUndo();
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [handleUndo, handleRedo, canUndo, canRedo]);

  return {
    tasks,
    canUndo,
    canRedo,
    pushHistory,
    handleUndo,
    handleRedo,
  };
}
