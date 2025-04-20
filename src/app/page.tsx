"use client";

import React, { useState, lazy, Suspense, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prioritizeTask } from "@/ai/flows/prioritize-task";
import { categorizeTask } from "@/ai/flows/categorize-task";
import { suggestSubtasks } from "@/ai/flows/suggest-subtasks";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { Icons } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Image from 'next/image'
import { ScrollArea } from "@/components/ui/scroll-area"

interface Subtask {
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
  deadline?: Date | undefined;
  subtasks?: Subtask[];
  completed: boolean;
}

const defaultTasks: Task[] = [
  {
    id: "1",
    title: "Grocery Shopping",
    description: "Buy groceries for the week",
    category: "Errands",
    priority: 75,
    deadline: new Date("2024-08-15"),
    subtasks: [
      { id: "1a", title: "Create grocery list", completed: false },
      { id: "1b", title: "Go to the supermarket", completed: false },
    ],
    completed: false,
  },
  {
    id: "2",
    title: "Meeting with John",
    description: "Discuss project progress",
    category: "Work",
    priority: 90,
    deadline: new Date("2024-08-10"),
    subtasks: [
      { id: "2a", title: "Prepare presentation", completed: false },
      { id: "2b", title: "Send meeting invite", completed: false },
    ],
    completed: false,
  },
];

// Lazy load the TaskEditForm component
const TaskEditForm = lazy(() => import('@/components/TaskEditForm').then(module => ({ default: module.TaskEditForm })));

// Define a more specific type for initial icons
const initialCategoryIcons: { [key: string]: string } = {
  Work: "💼",
  Home: "🏠",
  Errands: "🏃‍♂️",
  Personal: "👤",
  Health: "⚕️",
  Finance: "💰",
  Education: "📚",
  Social: "🫂",
  Travel: "✈️",
  Other: "📌",
};

export default function Home() {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [tempTask, setTempTask] = useState<Task | null>(null);
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryEmoji, setCustomCategoryEmoji] = useState("");
  const undoTimeout = useRef<number | null>(null); // Use useRef for timeout
  const [lastTaskState, setLastTaskState] = useState<Task[]>(tasks);
  const [showUndo, setShowUndo] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false); // State for Emoji Picker visibility
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false); // State for create category dialog
  // Use the more generic type for the state setter to match TaskEditForm prop
  const [categoryIconsState, setCategoryIconsState]: [ { [key: string]: string }, Dispatch<SetStateAction<{ [key: string]: string }>> ] = useState(initialCategoryIcons);


  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsLoading(true);

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      category: selectedCategory,
    };

    try {
      const priorityResult = await prioritizeTask({
        task: newTask.title,
        deadline: selectedDate?.toISOString() || new Date().toISOString(),
        importance: 5,
        category: newTask.category || "Other",
      });
      const subtasksResult = await suggestSubtasks({
        taskDescription: newTask.title,
      });

      newTask.priority = priorityResult.priorityScore;
      newTask.deadline = selectedDate;
      newTask.subtasks = subtasksResult.subtasks.map((subtask, index) => ({
        id: `${newTask.id}-subtask-${index}`,
        title: subtask,
        completed: false,
      }));

      setTasks([...tasks, newTask]);
      setNewTaskTitle("");
      setSelectedDate(new Date());
      setSelectedCategory(undefined);

      toast({
        title: "Task added successfully!",
        description: `"${newTask.title}" has been added to your list.`,
      });
    } catch (error) {
      console.error("Error processing task:", error);
      toast({
        variant: "destructive",
        title: "Error adding task",
        description: "Failed to process task. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }

    // Clear any existing timeout
    if (undoTimeout.current) {
      clearTimeout(undoTimeout.current);
    }

    // Set a timeout to hide the undo option after 5 seconds
    undoTimeout.current = window.setTimeout(() => {
      setShowUndo(false);
    }, 5000);
  };

  const handleTaskCompletion = (id: string, completed: boolean) => {
    // Store the previous task state for potential undo
    setLastTaskState(tasks);

    const updatedTasks = tasks.map((task) => {
      if (task.id === id) {
        // Update the main task
        const updatedTask = { ...task, completed: completed };

        // Update all subtasks to match the main task's completion status
        if (updatedTask.subtasks) {
          updatedTask.subtasks = updatedTask.subtasks.map(subtask => ({
            ...subtask,
            completed: completed,
          }));
        }
        return updatedTask;
      }
      return task;
    });

    setTasks(updatedTasks);
    setShowUndo(true);

    // Clear any existing timeout
    if (undoTimeout.current) {
      clearTimeout(undoTimeout.current);
    }

    // Set a timeout to hide the undo option after 5 seconds
    undoTimeout.current = window.setTimeout(() => {
      setShowUndo(false);
    }, 5000);
  };

  const handleSubtaskCompletion = (taskId: string, subtaskId: string, completed: boolean) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks?.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, completed: completed } : subtask
            ),
          };
        }
        return task;
      })
    );
  };

  const handleUpdateTask = (id: string, updatedTask: Partial<Task>) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, ...updatedTask } : task
      )
    );
    setEditingTaskId(null);
    toast({
      title: "Task updated",
      description: "Your task has been updated successfully.",
    });
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
    toast({
      title: "Task deleted",
      description: "The task has been permanently deleted.",
    });
  };

  const handleEditTask = (task: Task) => {
    if (editingTaskId) {
      setIsAlertOpen(true);
      setTempTask(task);
    } else {
      setEditingTaskId(task.id);
    }
  };

  const confirmDiscard = () => {
    setEditingTaskId(tempTask?.id || null);
    setIsAlertOpen(false);
    setTempTask(null);
  };

  const cancelDiscard = () => {
    setIsAlertOpen(false);
    setTempTask(null);
  };

  function getPriorityColor(priority: number | undefined): "destructive" | "secondary" | "default" {
    if (!priority) return "secondary";
    if (priority > 75) return "destructive";
    if (priority > 50) return "default"; // Changed from "primary"
    return "secondary";
  }

  const taskCategories = [
    "Work",
    "Home",
    "Errands",
    "Personal",
    "Health",
    "Finance",
    "Education",
    "Social",
    "Travel",
    "Other",
  ];

  const categoryIcons = {
    Work: "💼",
    Home: "🏠",
    Errands: "🏃‍♂️",
    Personal: "👤",
    Health: "⚕️",
    Finance: "💰",
    Education: "📚",
    Social: "🫂",
    Travel: "✈️",
    Other: "📌",
  };

  const handleCreateCategory = () => {
    if (customCategory.trim() && customCategoryEmoji.trim()) {
      setCategoryIconsState(prevState => ({
        ...prevState,
        [customCategory]: customCategoryEmoji,
      }));
      setSelectedCategory(customCategory); // Auto-select the new category
      setCustomCategory("");
      setCustomCategoryEmoji("");
      setIsCreateCategoryOpen(false);
    }
  };

  const handleUndo = () => {
    if (undoTimeout.current) {
      clearTimeout(undoTimeout.current);
    }
    setTasks(lastTaskState);
    setShowUndo(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setCustomCategoryEmoji(emoji);
    setIsEmojiPickerOpen(false); // Close the picker after selection
  };

  const handleCategorySelect = (value: string | undefined) => {
    if (value === 'create_new') {
      setIsCreateCategoryOpen(true);
    } else {
      setSelectedCategory(value);
    }
  };


  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <Image
            src="/images/logo.png"
            alt="TaskWise Logo"
            width={128}
            height={128}
          />
          <CardTitle>TaskWise</CardTitle>
          <CardDescription>
            Organize your life with AI-powered task management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Add a task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <Select onValueChange={handleCategorySelect} value={selectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryIconsState).map(([category, icon]) => (
                  <SelectItem key={category} value={category}>
                    {icon} {category}
                  </SelectItem>
                ))}
                <SelectItem value="create_new">
                  Create New
                </SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Icons.calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) =>
                    date < new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleAddTask} disabled={isLoading}>
              {isLoading ? (
                <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Add Task"
              )}
            </Button>
          </div>

          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={(checked) => {
                          if (typeof checked === 'boolean') {
                            handleTaskCompletion(task.id, checked);
                          }
                        }}
                      />
                      <Label htmlFor={`task-${task.id}`} style={{ textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.5 : 1 }}>{task.title}</Label>
                    </div>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.category ? `${categoryIconsState[task.category as keyof typeof categoryIconsState]} ${task.category}`: "No Category"} - Priority: {task.priority}
                    </Badge>
                  </CardHeader>
                  <CardContent style={{ opacity: task.completed ? 0.5 : 1 }}>
                    {editingTaskId === task.id ? (
                      <Suspense fallback={<div>Loading...</div>}>
                        <TaskEditForm
                          task={task}
                          onUpdate={(updatedTask) => handleUpdateTask(task.id, updatedTask)}
                          onCancel={() => setEditingTaskId(null)}
                          categoryIcons={categoryIconsState} // Pass the category icons
                          setCategoryIcons={setCategoryIconsState}
                        />
                      </Suspense>
                    ) : (
                      <>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                        {task.deadline && (
                          <p className="text-sm text-muted-foreground">
                            Deadline: {task.deadline ? format(task.deadline, "PPP") : "No deadline"}
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
                                      if (typeof checked === 'boolean') {
                                        handleSubtaskCompletion(task.id, subtask.id, checked);
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`subtask-${subtask.id}`}  style={{ textDecoration: subtask.completed ? 'line-through' : 'none' }}>{subtask.title}</Label>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex justify-end space-x-2">
                          <Button onClick={() => handleEditTask(task)} disabled={task.completed}>Edit</Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
              {showUndo && (
                <Button variant="outline" onClick={handleUndo}>
                  Undo
                </Button>
              )}
        </CardContent>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You are currently editing a task. Do you want to discard the
              changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={confirmDiscard}>
            Discard
          </AlertDialogAction>
          <AlertDialogCancel onClick={cancelDiscard}>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Category</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the category name and select an emoji.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-name" className="text-right">
                Name
              </Label>
              <Input
                type="text"
                id="category-name"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-emoji" className="text-right">
                Emoji
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Input
                  type="text"
                  id="category-emoji"
                  value={customCategoryEmoji}
                  onChange={(e) => setCustomCategoryEmoji(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                >
                  <Icons.plusCircle className="h-4 w-4" />
                </Button>
                {isEmojiPickerOpen && (
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setIsEmojiPickerOpen(false)} />
                )}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsCreateCategoryOpen(false);
              setCustomCategory("");
              setCustomCategoryEmoji("");
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateCategory}>Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const emojis = ["😀", "😂", "😎", "😍", "🤔", "😴", "🤯", "🤪", "👍", "👎", "❤️", "💯", "🔥", "⭐", "🚀", "🎉", "🐶", "🐱", "🐭", "⚽", "🏀", "🏈", "🌷", "🌻", "🌹", "🍎", "🚙", "🍇"];

  return (
    <div className="absolute z-10 bg-white shadow-md rounded-md p-2 w-64">
       <ScrollArea className="h-[200px] w-full rounded-md border">
          <div className="grid grid-cols-5 gap-2">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className="text-2xl hover:bg-gray-100 rounded-md"
                onClick={() => onEmojiSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
      </ScrollArea>
      <Button variant="ghost" className="w-full mt-2" onClick={onClose}>
        Close
      </Button>
    </div>
  );
};
interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const AlertDialogFooter = ({
                               className,
                               ...props
                             }: AlertDialogFooterProps) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"
