"use client";

import React, { useState } from 'react';
import { CreateCategoryModal } from './CreateCategoryModal';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Icons } from "@/components/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from "@/app/types/task";

interface TaskEditFormProps {
  task: Task;
  onUpdate: (updatedTask: Partial<Task>) => void;
  onCancel: () => void;
  categoryIcons: { [key: string]: string };
  setCategoryIcons: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  isCreateCategoryOpen: boolean;
  setIsCreateCategoryOpen: (open: boolean) => void;
  onCreateCategory: (category: string, emoji: string) => void;
}

/**
 * TaskEditForm component allows editing of a task's details, including title, description,
 * category (with emoji), priority, and deadline. Also supports creating new categories with emoji.
 */
export function TaskEditForm({ task, onUpdate, onCancel, categoryIcons, setCategoryIcons, isCreateCategoryOpen, setIsCreateCategoryOpen, onCreateCategory }: TaskEditFormProps) {
  // Local state for each editable field
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || ""); // Task description
  const [category, setCategory] = useState(task.category || ""); // Task category
  const [priority, setPriority] = useState(task.priority || 50); // Task priority (default 50)
  const [deadline, setDeadline] = useState<Date | undefined>(task.deadline); // Task deadline
  const [subtasks, setSubtasks] = useState(task.subtasks || []);


  // Save changes and propagate updated task details
  const handleSave = () => {
    onUpdate({
      title,
      description,
      category,
      priority,
      deadline,
      subtasks,
    });
  };

  // Handle category dropdown selection (including new category option)
const handleCategorySelect = (value: string | undefined) => {
    if (value === 'create_new') {
      setIsCreateCategoryOpen(true);
    } else {
      setCategory(value);
    }
  };


  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={handleCategorySelect} value={category}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryIcons).map(([cat, icon]) => (
              <SelectItem key={cat} value={cat}>
                {icon} {cat}
              </SelectItem>
            ))}
            <SelectItem value="create_new">
              Create New
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="priority">Priority</Label>
        <Input
          type="number"
          id="priority"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal hover:bg-background hover:border-input hover:text-foreground",
                !deadline && "text-muted-foreground"
              )}
            >
              <Icons.calendar className="mr-2 h-4 w-4" />
              {deadline ? (
                format(deadline, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={setDeadline}
              disabled={(date) =>
                date < new Date()
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {/* Subtasks Editing */}
      <div className="grid gap-2">
        <Label>Subtasks</Label>
        <div className="flex flex-col gap-2">
          {subtasks.length === 0 && (
            <span className="text-sm text-gray-400">No subtasks. Add one below.</span>
          )}
          {subtasks.map((subtask, idx) => (
            <div key={subtask.id || idx} className="flex items-center gap-2">
              <Input
                type="text"
                value={subtask.title}
                onChange={e => {
                  const newSubtasks = [...subtasks];
                  newSubtasks[idx] = { ...subtasks[idx], title: e.target.value };
                  setSubtasks(newSubtasks);
                }}
                className="flex-1"
                placeholder={`Subtask ${idx + 1}`}
              />
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={e => {
                  const newSubtasks = [...subtasks];
                  newSubtasks[idx] = { ...subtasks[idx], completed: e.target.checked };
                  setSubtasks(newSubtasks);
                }}
                aria-label="Completed"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="category-clear-btn"
                onClick={() => {
                  setSubtasks(subtasks.filter((_, i) => i !== idx));
                }}
                aria-label="Delete subtask"
              >
                <Icons.trash className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-2 category-green-btn"
          onClick={() => {
            setSubtasks([
              ...subtasks,
              { id: `${task.id}-subtask-${Date.now()}-${subtasks.length}`, title: '', completed: false }
            ]);
          }}
        >
          + Add Subtask
        </Button>
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="secondary" onClick={onCancel} className="category-clear-btn">
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
        {/* Shared Create Category Modal */}
        <CreateCategoryModal
          open={isCreateCategoryOpen}
          onOpenChange={setIsCreateCategoryOpen}
          onCreate={(category, emoji) => {
            setCategoryIcons(prev => ({ ...prev, [category]: emoji }));
            setCategory(category);
            onCreateCategory(category, emoji);
          }}
        />
    </div>
  );
}
