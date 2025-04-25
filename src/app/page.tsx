"use client";

import React, { useState, lazy, Suspense, useRef, useEffect } from "react";
import { getStoredTasks, saveTasks, getStoredCategoryIcons, saveCategoryIcons, getStoredCustomCategories, saveCustomCategories } from "@/lib/storage";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { useTaskActions } from "./hooks/useTaskActions";
import { useCategoryActions } from "./hooks/useCategoryActions";
import { useDatePicker } from "./hooks/useDatePicker";
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
import { clearAllData } from "@/lib/storage";
import "./clear-selection.css"; // Custom styles for category clear button
import "./category-green.css"; // Custom styles for green hover/focus
import { ModeToggle } from "@/components/theme-toggle";
import { ClearAllDataButton } from "@/components/ClearAllDataButton";

import type { Task, Subtask } from "./types/task";

const defaultTasks: Task[] = [
  {
    id: "1",
    title: "Explore TaskWise features",
    description: "Get acquainted with TaskWise's capabilities",
    category: "Other",
    priority: 50,
    deadline: new Date("2025-08-01"),
    subtasks: [
      { id: "1a", title: "Explore categories", completed: false },
      { id: "1b", title: "Create custom category", completed: false },
      { id: "1c", title: "Explore subtasks auto-generation", completed: false },
    ],
    completed: false,
  },
];

// Lazy load the TaskEditForm component to optimize initial load time.
const TaskEditForm = lazy(() => import('@/components/TaskEditForm').then(module => ({ default: module.TaskEditForm })));

// Default emoji icons for each built-in category. Used for display and selection.
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

// Main application component for TaskWise. Handles task state, UI, and orchestrates all hooks.
export default function Home() {
  // List of built-in categories (cannot be deleted by user)
  const builtInCategories = [
    "Work", "Home", "Errands", "Personal", "Health", "Finance", "Education", "Social", "Travel", "Other"
  ];

  // State for the new task input field (user input for new task title)
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Undo/Redo state and logic for task history
// history: stores snapshots of task lists for undo/redo
// historyIndex: current position in history stack
  const [history, setHistory] = useState<Task[][]>([defaultTasks]); // Start with defaultTasks to prevent undefined
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true); // Add loading state to handle initialization period
  const { toast } = useToast();
  
  // Initialize tasks from localStorage or use default tasks
  useEffect(() => {
    const storedTasks = getStoredTasks();
    if (storedTasks && storedTasks.length > 0) {
      setHistory([storedTasks]);
      setHistoryIndex(0);
      toast({ title: "Tasks loaded from localStorage" });
    }
    setIsLoading(false); // Mark loading as complete regardless of outcome
  }, []);

  // Custom undo/redo hook for tasks
// Provides tasks, canUndo/canRedo, and history manipulation functions
  const {
    tasks,
    canUndo,
    canRedo,
    pushHistory: originalPushHistory,
    handleUndo,
    handleRedo,
  } = useUndoRedo<Task>({
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    toast,
  });
  
  // Wrap pushHistory to also save to localStorage
  const pushHistory = (newTasksState: Task[]) => {
    originalPushHistory(newTasksState);
    saveTasks(newTasksState);
  };

  // Loading state for AI operations (separate from initial data loading)
  const [isAiLoading, setIsAiLoading] = useState(false);

  // State for editing tasks, alert dialogs, and temporary task data
// editingTaskId: which task is being edited
// isAlertOpen: controls alert dialog visibility
// tempTask: holds a task being temporarily modified or confirmed for deletion
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [tempTask, setTempTask] = useState<Task | null>(null);

  // All task-related actions (CRUD, completion, edit, discard) from custom hook
// Provides handlers for task completion, editing, deletion, and discard confirmation/cancellation
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

  // All category-related state and actions (custom categories, emoji picker, etc.)
// Manages custom categories, emoji selection, category creation/deletion, and related UI state
  // Load stored category icons
  const [loadedCategoryIcons, setLoadedCategoryIcons] = useState(initialCategoryIcons);
  
  useEffect(() => {
    console.log('[PAGE] Initial category load started');
    console.log('[PAGE] Built-in categories:', builtInCategories);
    console.log('[PAGE] Initial category icons:', initialCategoryIcons);
    
    // First, get the built-in category icons
    const categoryIconsToLoad = { ...initialCategoryIcons };
    console.log('[PAGE] Default categories loaded:', categoryIconsToLoad);
    
    // Then, get custom categories from localStorage
    const storedCustomCategories = getStoredCustomCategories();
    console.log('[PAGE] Custom categories from storage:', storedCustomCategories);
    
    if (storedCustomCategories && Object.keys(storedCustomCategories).length > 0) {
      console.log('[PAGE] Found stored custom categories, merging with defaults');
      // Merge custom categories with built-in ones
      Object.entries(storedCustomCategories).forEach(([category, icon]) => {
        categoryIconsToLoad[category] = icon;
        console.log(`[PAGE] Added custom category: ${category} with emoji: ${icon}`);
      });
      
      toast({ 
        title: "Custom categories loaded", 
        description: `Loaded ${Object.keys(storedCustomCategories).length} custom categories`
      });
    } else {
      console.log('[PAGE] No custom categories found in storage');
    }
    
    console.log('[PAGE] Final categories to load:', categoryIconsToLoad);
    setLoadedCategoryIcons(categoryIconsToLoad);
  }, []);

  const {
    customCategory, setCustomCategory,
    customCategoryEmoji, setCustomCategoryEmoji,
    isEmojiPickerOpen, setIsEmojiPickerOpen,
    isCreateCategoryOpen, setIsCreateCategoryOpen,
    categoryIconsState, setCategoryIconsState,
    selectedCategory, setSelectedCategory,
    isManageCategoriesOpen, setIsManageCategoriesOpen,
    handleCreateCategory: originalHandleCreateCategory,
    handleDeleteCategory: originalHandleDeleteCategory,
    handleEmojiSelect,
    handleCategorySelect,
  } = useCategoryActions({
    initialCategoryIcons: loadedCategoryIcons,
    builtInCategories,
    tasks,
    pushHistory,
  });
  
  console.log('[PAGE] Category icons state after initialization:', categoryIconsState);
  
  // Wrap category handlers to save to localStorage
  const handleCreateCategory = () => {
    if (customCategory && customCategoryEmoji) {
      console.log(`[PAGE] Creating new custom category: ${customCategory} with emoji: ${customCategoryEmoji}`);
      originalHandleCreateCategory();
      
      console.log('[PAGE] Category state before update:', categoryIconsState);
      const updatedIcons = { ...categoryIconsState, [customCategory]: customCategoryEmoji };
      console.log('[PAGE] Updated icons after category creation:', updatedIcons);
      
      saveCategoryIcons(updatedIcons);
      // Also save custom categories separately
      saveCustomCategories(updatedIcons, builtInCategories);
      toast({ title: "Custom category created", description: `${customCategoryEmoji} ${customCategory}` });
    }
  };
  
  const handleDeleteCategory = (category: string) => {
    console.log(`[PAGE] Deleting custom category: ${category}`);
    originalHandleDeleteCategory(category);
    
    console.log('[PAGE] Category state before delete update:', categoryIconsState);
    const updatedIcons = { ...categoryIconsState };
    delete updatedIcons[category];
    console.log('[PAGE] Updated icons after category deletion:', updatedIcons);
    
    saveCategoryIcons(updatedIcons);
    // Also update custom categories
    saveCustomCategories(updatedIcons, builtInCategories);
    toast({ title: "Custom category deleted", description: category });
  };
  
  // Save category icons when they change
  useEffect(() => {
    console.log('[PAGE] Category icons state changed:', categoryIconsState);
    
    if (Object.keys(categoryIconsState).length > 0) {
      console.log('[PAGE] Saving updated category icons to storage');
      saveCategoryIcons(categoryIconsState);
      
      // Also save custom categories separately
      saveCustomCategories(categoryIconsState, builtInCategories);
    }
  }, [categoryIconsState]);

  // Date picker state and logic from custom hook
// Handles selected date, clearing, and today check
  const {
    selectedDate, setSelectedDate, handleClearDate, isToday
  } = useDatePicker(new Date());


  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsAiLoading(true);

    // Create initial task object for new task entry
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

      // Ensure we have a category for prioritization (default to "Other" if AI fails)
      const categoryForPrioritization = newTask.category || "Other";

      // --- AI Prioritization & Subtasks ---
// Run AI flows for priority score and subtask suggestions in parallel
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

      // Update task with AI results (priority and subtasks)
      newTask.priority = priorityResult.priorityScore;
      newTask.subtasks = subtasksResult.subtasks.map((subtaskTitle, index) => ({
        id: `${newTask.id}-subtask-${index}`,
        title: subtaskTitle,
        completed: false,
      }));

      // Add task to state and history (using pushHistory for undo/redo support)
      pushHistory([...tasks, newTask]); // Use pushHistory

      // Reset form inputs for next task entry
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
      setIsAiLoading(false);
    }
  };


  // Function to determine border color class based on priority
// Returns a CSS class for border color based on priority score
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

  // (category and emoji logic moved to useCategoryActions)
// (date picker logic moved to useDatePicker)
  // (date picker logic moved to useDatePicker)


  

  return (
    <div className="container mx-auto p-4">
      {/* Header row with theme toggle removed; trashcan now in layout */}
      <div className="mb-2" />
      <Card className="relative">
        <div className="absolute top-6 right-6 z-10 flex items-center space-x-2">
          <ModeToggle />
          <ClearAllDataButton />
        </div>
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
          <div className="mb-4 flex flex-wrap items-center gap-2 max-w-full overflow-hidden">
            <Input
  type="text"
  placeholder="Add a task..."
  value={newTaskTitle}
  onChange={(e) => setNewTaskTitle(e.target.value)}
  className="flex-grow"
  onKeyDown={(e) => {
    if (e.key === "Enter" && !isLoading && !isAiLoading) {
      handleAddTask();
    }
  }}
/>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 w-full sm:w-auto">
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
                className="border border-gray-300 category-clear-btn flex-shrink-0"
              >
                Clear Selection
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Manage Categories"
                className="ml-1 category-green-btn flex-shrink-0"
                onClick={() => setIsManageCategoriesOpen(true)}
              >
                <Icons.settings className="h-5 w-5" />
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal hover:bg-background hover:border-input hover:text-foreground",
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
      className="w-full mt-2 category-clear-btn"
      onClick={() => setSelectedDate(new Date())}
      disabled={!selectedDate || (selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))}
    >
      Clear Selection
    </Button>
  </div>
</PopoverContent>
            </Popover>

            {/*
            Manage Categories Modal
            Allows the user to delete custom categories. Built-in categories are protected.
          */}
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
                <AlertDialogCancel className="mt-4 category-clear-btn">Close</AlertDialogCancel>
              </AlertDialogContent>
            </AlertDialog>

            {/*
              Add Task Button: triggers task creation, disabled while loading
              HistoryControls: Undo/Redo buttons for task list changes
            */}
            <Button onClick={handleAddTask} disabled={isLoading || isAiLoading}>
              {(isLoading || isAiLoading) ? (
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

          {/*
            Task List
            Renders all tasks with completion, editing, deletion, and subtask controls.
            Each task card displays title, priority, category, description, deadline, and subtasks.
          */}
          <ul className="space-y-2 mt-4">
            {isLoading ? (
              // Show loading placeholder while data is being loaded
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading tasks...</span>
              </div>
            ) : tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <li key={task.id}>
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center space-x-2">
                        {/* Task completion checkbox */}
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={task.completed}
                          onCheckedChange={(checked) => {
                            if (typeof checked === 'boolean') {
                              handleTaskCompletion(task.id, checked);
                            }
                          }}
                        />
                        {/* Task title with strike-through if completed */}
                        <Label htmlFor={`task-${task.id}`} style={{ textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.5 : 1 }}>{task.title}</Label>
                      </div>
                      {/* Priority and category badge */}
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
                      {/* Show edit form if editing this task */}
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
                          {/* Task description (if present) */}
                          {task.description && (
                            <p className="text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          )}
                          {/* Deadline (if present) */}
                          {task.deadline && (
                            <p className="text-sm text-muted-foreground">
                              Deadline: {task.deadline ? format(task.deadline, "PPP") : "No deadline"}
                            </p>
                          )}
                          {/* Subtasks (if present) */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium">Subtasks:</h4>
                              <ul className="list-disc pl-4">
                                {task.subtasks.map((subtask) => (
                                  <li key={subtask.id} className="text-xs flex items-center space-x-4">
                                    {/* Subtask completion checkbox */}
                                    <Checkbox
                                      id={`subtask-${subtask.id}`}
                                      checked={subtask.completed}
                                      onCheckedChange={(checked) => {
                                        if (typeof checked === 'boolean') {
                                          handleSubtaskCompletion(task.id, subtask.id, checked);
                                        }
                                      }}
                                    />
                                    {/* Subtask title with strike-through if completed */}
                                    <Label htmlFor={`subtask-${subtask.id}`}  style={{ textDecoration: subtask.completed ? 'line-through' : 'none' }}>{subtask.title}</Label>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* Edit/Delete controls */}
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
              ))
            ) : (
              // Show message when no tasks are available
              <div className="text-center py-8 text-muted-foreground">
                <p>No tasks yet. Create your first task above!</p>
              </div>
            )}
          </ul>
        </CardContent>
      </Card>
      {/*
        Discard Changes Modal
        Confirms with the user before discarding edits to a task.
{{ ... }} (rest of the code remains the same)
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
          <AlertDialogCancel onClick={cancelDiscard} className="category-clear-btn">Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
      {/*
        Create Category Modal
        Allows the user to add a new custom category with an emoji icon.
      */}
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
                {/* Emoji picker button and popover */}
                <Button
                  variant="outline"
                  size="icon"
                  className="category-green-btn"
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
            }} className="category-clear-btn">Cancel</AlertDialogCancel>
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
            {emojis.map(/**
 * Renders a button for selecting an emoji.
 *
 * @param {string} emoji - The emoji to be displayed on the button.
 * @returns {JSX.Element} A button element that triggers the onEmojiSelect function when clicked.
 */
(emoji) => (
  <button
    key={emoji}
    className="text-2xl hover:bg-[rgba(139,233,253,0.1)] hover:text-[#8be9fd] rounded-md transition-colors"
    onClick={() => onEmojiSelect(emoji)}
  >
    {emoji}
  </button>
))}
          </div>
      </ScrollArea>
      <Button variant="ghost" className="w-full mt-2 category-green-btn" onClick={onClose}>
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
