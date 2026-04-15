"use client";

import React, { Suspense, lazy } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Task } from "@/app/types/task";

const TaskEditForm = lazy(() =>
  import("@/components/TaskEditForm").then((module) => ({
    default: module.TaskEditForm,
  }))
);

function getPriorityBorderClass(priority: number | undefined): string {
  if (!priority || priority <= 50) return "border-accent";
  if (priority <= 75) return "border-warning";
  return "border-destructive";
}

interface TaskCardProps {
  task: Task;
  isEditing: boolean;
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

export function TaskCard({
  task,
  isEditing,
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
}: TaskCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                onTaskCompletion(task.id, checked);
              }
            }}
          />
          <Label
            htmlFor={`task-${task.id}`}
            style={{
              textDecoration: task.completed ? "line-through" : "none",
              opacity: task.completed ? 0.5 : 1,
            }}
          >
            {task.title}
          </Label>
        </div>
        <Badge
          variant="outline"
          className={cn("border-2", getPriorityBorderClass(task.priority))}
        >
          {task.category
            ? `${categoryIcons[task.category] ?? ""} ${task.category}`
            : "No Category"}{" "}
          - Priority: {task.priority}
        </Badge>
      </CardHeader>
      <CardContent style={{ opacity: task.completed ? 0.5 : 1 }}>
        {isEditing ? (
          <Suspense fallback={<div>Loading...</div>}>
            <TaskEditForm
              task={task}
              onUpdate={(updatedTask) => onUpdateTask(task.id, updatedTask)}
              onCancel={onCancelEdit}
              categoryIcons={categoryIcons}
              setCategoryIcons={setCategoryIcons}
              isCreateCategoryOpen={isCreateCategoryOpen}
              setIsCreateCategoryOpen={setIsCreateCategoryOpen}
              onCreateCategory={onCreateCategory}
            />
          </Suspense>
        ) : (
          <>
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            {task.deadline && (
              <p className="text-sm text-muted-foreground">
                Deadline: {format(task.deadline, "PPP")}
              </p>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium">Subtasks:</h4>
                <ul className="list-disc pl-4">
                  {task.subtasks.map((subtask) => (
                    <li key={subtask.id} className="text-xs flex items-center space-x-4">
                      <Checkbox
                        id={`subtask-${subtask.id}`}
                        checked={subtask.completed}
                        onCheckedChange={(checked) => {
                          if (typeof checked === "boolean") {
                            onSubtaskCompletion(task.id, subtask.id, checked);
                          }
                        }}
                      />
                      <Label
                        htmlFor={`subtask-${subtask.id}`}
                        style={{ textDecoration: subtask.completed ? "line-through" : "none" }}
                      >
                        {subtask.title}
                      </Label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button onClick={() => onEditTask(task)} disabled={task.completed}>Edit</Button>
              <Button variant="destructive" onClick={() => onDeleteTask(task.id)}>Delete</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
