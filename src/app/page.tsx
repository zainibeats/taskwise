"use client";

import React, { useState, lazy, Suspense, useRef } from "react";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { useTaskActions } from "./hooks/useTaskActions";
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
import { ToastAction } from "@/components/ui/toast"
import { HistoryControls } from "@/components/history-controls";
import "./clear-selection.css"; // Custom styles for category clear button
import "./category-green.css"; // Custom styles for green hover/focus


import type { Task, Subtask } from "./types/task";

const defaultTasks: Task[] = [
  {
    id: "1",
    title: "Explore TaskWise features",
    description: "Get acquainted with TaskWise's capabilities",
    category: "Other",
    priority: 50,
    deadline: new Date("2025-08-1"),
    subtasks: [
      { id: "1a", title: "Explore categories", completed: false },
      { id: "1b", title: "Explore subtasks auto-generation", completed: false },
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
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const builtInCategories = [
    "Work", "Home", "Errands", "Personal", "Health", "Finance", "Education", "Social", "Travel", "Other"
  ];
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [history, setHistory] = useState<Task[][]>([defaultTasks]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const { toast } = useToast();

  // Undo/Redo logic modularized
  const { tasks, canUndo, canRedo, pushHistory, handleUndo, handleRedo } = useUndoRedo<Task>({
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    toast,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [tempTask, setTempTask] = useState<Task | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  // Modularized task handlers
  const {
    handleTaskCompletion,
    handleSubtaskCompletion,
    handleUpdateTask,
    handleDeleteTask,
    handleEditTask,
    confirmDiscard,
    cancelDiscard
  } = useTaskActions({
    tasks,
    pushHistory,
    setEditingTaskId,
    setIsAlertOpen,
    setTempTask,
    toast
  });
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryEmoji, setCustomCategoryEmoji] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [categoryIconsState, setCategoryIconsState]: [ { [key: string]: string }, Dispatch<SetStateAction<{ [key: string]: string }>> ] = useState(initialCategoryIcons);


  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsLoading(true);

    // Create initial task object
    let taskCategory = selectedCategory; // Use selected category if available
    // Gather all categories (built-in + custom)
    const allCategories = Object.keys(categoryIconsState);
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      category: taskCategory, // Assign potentially undefined category initially
      deadline: selectedDate, // Assign selected date
      subtasks: [], // Initialize subtasks
      priority: undefined // Initialize priority
    };

    try {
      // --- AI Categorization (if needed) ---
      if (!taskCategory) {
        // If no category selected, use AI to suggest one from all categories (built-in + custom)
        const aiCategory = await categorizeTask({
          taskDescription: newTask.title,
          categories: allCategories,
        });
        newTask.category = aiCategory.category;
      }

      // Ensure we have a category for prioritization (default to "Other" if AI fails?)
      const categoryForPrioritization = newTask.category || "Other";

      // --- AI Prioritization & Subtasks ---
      const [priorityResult, subtasksResult] = await Promise.all([
        prioritizeTask({
          task: newTask.title,
          deadline: newTask.deadline?.toISOString() || new Date().toISOString(),
          importance: 5, // Default importance for now
          category: categoryForPrioritization, // Use determined category
        }),
        suggestSubtasks({
          taskDescription: newTask.title,
        })
      ]);

      // Update task with AI results
      newTask.priority = priorityResult.priorityScore;
      newTask.subtasks = subtasksResult.subtasks.map((subtaskTitle, index) => ({
        id: `${newTask.id}-subtask-${index}`,
        title: subtaskTitle,
        completed: false,
      }));

      // Add task to state and history
      pushHistory([...tasks, newTask]); // Use pushHistory

      // Reset form
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
  };


  // Function to determine border color class based on priority
  function getPriorityBorderClass(priority: number | undefined): string {
    if (!priority || priority <= 50) return "border-accent"; // Low priority (<= 50) -> Green (Accent)
    if (priority <= 75) return "border-warning"; // Medium priority (> 50 and <= 75) -> Yellow (Warning)
    return "border-destructive"; // High priority (> 75) -> Red (Destructive)
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

  // Delete custom category and update tasks
  const handleDeleteCategory = (categoryToDelete: string) => {
    setCategoryIconsState(prevState => {
      const newState = { ...prevState };
      delete newState[categoryToDelete];
      return newState;
    });
    // Update all tasks with this category to 'Uncategorized'
    const updatedTasks = tasks.map(task =>
      task.category === categoryToDelete
        ? { ...task, category: "Uncategorized" }
        : task
    );
    pushHistory(updatedTasks);
    setSelectedCategory(undefined);
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
        <CardHeader className="flex flex-col items-center text-center">
          <Image
            src="/images/logo.png"
            alt="TaskWise Logo"
            width={128}
            height={128}
          />
          <CardTitle className="mt-2">TaskWise</CardTitle>
          <CardDescription>
            Organize your life with AI-powered task management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="Add a task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-grow"
            />
            <div className="flex items-center gap-1">
              <div className="category-green-select">
                <Select 
                  key={selectedCategory ?? 'no-selection'} 
                  onValueChange={handleCategorySelect} 
                  value={selectedCategory}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 overflow-y-auto">
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
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedCategory(undefined)}
                disabled={!selectedCategory}
                className="border border-gray-300 category-clear-btn"
              >
                Clear Selection
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Manage Categories"
                className="ml-1 category-green-btn"
                onClick={() => setIsManageCategoriesOpen(true)}
              >
                <Icons.settings className="h-5 w-5" />
              </Button>
            </div>
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
  <div className="flex flex-col items-center gap-2 p-2">
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={setSelectedDate}
      disabled={(date) => date < new Date()}
      initialFocus
    />
    <Button
      type="button"
      variant="outline"
      className="w-full mt-2"
      onClick={() => setSelectedDate(new Date())}
      disabled={!selectedDate || (selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))}
    >
      Clear Selection
    </Button>
  </div>
</PopoverContent>
            </Popover>

            {/* Manage Categories Modal */}
            <AlertDialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Manage Custom Categories</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete any custom category you no longer need. Built-in categories cannot be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mt-2">
                  {Object.entries(categoryIconsState)
                    .filter(([cat]) => !builtInCategories.includes(cat))
                    .length === 0 && (
                      <span className="text-muted-foreground text-sm">No custom categories found.</span>
                    )}
                  {Object.entries(categoryIconsState)
                    .filter(([cat]) => !builtInCategories.includes(cat))
                    .map(([category, icon]) => (
                      <div key={category} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <span className="flex items-center gap-2">{icon} {category}</span>
                        <AlertDialogAction
                          asChild
                        >
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            aria-label={`Delete ${category}`}
                            onClick={() => handleDeleteCategory(category)}
                          >
                            <Icons.trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogAction>
                      </div>
                    ))}
                </div>
                <AlertDialogCancel className="mt-4">Close</AlertDialogCancel>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleAddTask} disabled={isLoading}>
              {isLoading ? (
                <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Add Task"
              )}
            </Button>
            <HistoryControls 
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </div>

          <ul className="space-y-2 mt-4">
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
                    <Badge 
                      variant="outline"
                      className={cn(
                        "border-2",
                        getPriorityBorderClass(task.priority)
                      )}
                    >
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
          <AlertDialogAction onClick={() => confirmDiscard(tempTask)}>
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
  const emojis = ["🤖", "🍽️", "🪴", "🍼", "🎁", "🎭", "🐾", "🧸", "🌐", "🔐", "🖥️", "🛠️", "💊", "⭐", "📧", "🎉", "🐶", "🐱", "🛐", "📞", "⚽", "🗨️", "🚜", "🎵", "💳", "✏️", "🚗", "🎬"];

  return (
    <div className="absolute z-10 bg-popover text-popover-foreground shadow-md rounded-md p-2 w-64">
       <ScrollArea className="h-[200px] w-full rounded-md border">
          <div className="grid grid-cols-5 gap-2">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className="text-2xl hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
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
