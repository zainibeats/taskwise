import { toast as showToast } from "@/hooks/use-toast";
import { type ToastActionElement } from "@/components/ui/toast";
import { debugLog } from "./debug";

// Extended toast props interface to include description
interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
  action?: ToastActionElement;
}

// List of operations that should NOT show success notifications
const SILENT_OPERATIONS = [
  "login",
  "load_tasks",
  "load_categories", 
  "create_task",
  "task_completion",
  "undo",
  "redo"
];

/**
 * Conditionally shows toast notifications
 * - Always shows error notifications (variant: "destructive")
 * - Only shows success notifications for operations not in SILENT_OPERATIONS
 * 
 * @param props Toast notification properties
 * @param operation The operation type (used to determine if notification should be shown)
 * @returns The toast result or undefined if notification was suppressed
 */
export function conditionalToast(props: ToastOptions, operation?: string) {
  // Always show error notifications
  if (props.variant === "destructive") {
    return showToast(props);
  }
  
  // For success notifications, only show if not in SILENT_OPERATIONS
  if (!operation || !SILENT_OPERATIONS.includes(operation)) {
    return showToast(props);
  }
  
  // Log silenced notifications for debugging
  debugLog(`Silenced notification for operation: ${operation}`, props);
  
  // Return undefined for silenced notifications
  return undefined;
}
