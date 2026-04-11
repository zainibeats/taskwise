// src/components/task-list.tsx
import React from 'react';
import { TaskItem } from './task-item'; // Assuming task-item.tsx is in the same directory
import type { Task } from '@/app/types/task';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
  // Add props for filtering and sorting later
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onUpdateTask }) => {
  if (!tasks || tasks.length === 0) {
    return <p className="text-center text-gray-500 mt-4">No tasks yet. Add one!</p>;
  }

  // TODO: Add filtering and sorting controls here

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskItem 
          key={task.id} 
          task={task} 
          onUpdateTask={onUpdateTask} 
        />
      ))}
    </div>
  );
};

export default TaskList; 