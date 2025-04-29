// src/components/task-item.tsx
import React, { useState } from 'react';
import { Button } from "./ui/button";
import { MoreHorizontal } from "lucide-react"; // Or use your icon system
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { suggestSubtasks } from '../ai/flows/suggest-subtasks';

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: number;
  deadline?: Date;
  completed: boolean;
  subtasks: SubTask[];
}

interface TaskItemProps {
  task: Task;
  onUpdateTask: (updatedTask: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdateTask }) => {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerateSubtasks = async () => {
    if (!task.title) return;
    
    setIsRegenerating(true);
    try {
      // Get current session to extract user ID
      const sessionResponse = await fetch('/api/auth/session');
      let userId: number | undefined = undefined;
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        userId = sessionData.user?.id;
      }
      
      // Call the AI function to generate new subtasks
      const result = await suggestSubtasks({ 
        taskDescription: task.title,
        userId: userId
      }); 
      
      // Create subtask objects from the suggestions
      const newSubtasks = result.subtasks.map((title, index) => ({
        id: `${task.id}-subtask-${Date.now()}-${index}`, 
        title,
        completed: false
      }));
      
      // Update the task with new subtasks
      onUpdateTask({
        ...task,
        subtasks: newSubtasks
      });
    } catch (error) {
      console.error("Failed to regenerate subtasks:", error);
      // Consider adding user feedback here (e.g., toast notification)
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 my-2">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{task.title}</h3>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRegenerateSubtasks} disabled={isRegenerating}>
              {isRegenerating ? "Regenerating..." : "Regenerate Subtasks"}
            </DropdownMenuItem>
            {/* Add other actions like Edit, Delete, etc. */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {task.description && (
        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
      )}
      
      {/* Display deadline, category, priority if available */}
      <div className="flex gap-2 mt-2 text-xs text-gray-500">
        {task.deadline && (
          <span>Due: {task.deadline.toLocaleDateString()}</span>
        )}
        {task.category && (
          <span>Category: {task.category}</span>
        )}
        {task.priority !== undefined && (
          <span>Priority: {task.priority}</span>
        )}
      </div>
      
      {/* Subtasks section */}
      <div className="mt-3">
        <h4 className="text-sm font-medium">Subtasks</h4>
        {task.subtasks.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {task.subtasks.map((subtask) => (
              <li key={subtask.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => {
                    const updatedSubtasks = task.subtasks.map((st) =>
                      st.id === subtask.id ? { ...st, completed: !st.completed } : st
                    );
                    onUpdateTask({ ...task, subtasks: updatedSubtasks });
                  }}
                />
                <span className={subtask.completed ? "line-through text-gray-400" : ""}>
                  {subtask.title}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 mt-1">No subtasks generated yet. Create task first.</p> 
        )}
      </div>
      
      {/* Removed the redundant button at the bottom as it's in the dropdown */}
    </div>
  );
};

export default TaskItem; 