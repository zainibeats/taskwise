"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { TaskApi, CategoryApi, UserSettingsApi } from "@/lib/api-client";
import { useUndoRedo } from "./hooks/useUndoRedo";
import { useTaskActions } from "./hooks/useTaskActions";
import { useCategoryActions } from "./hooks/useCategoryActions";
import { useDatePicker } from "./hooks/useDatePicker";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { prioritizeTask } from "@/ai/flows/prioritize-task";
import { categorizeTask } from "@/ai/flows/categorize-task";
import { suggestSubtasks } from "@/ai/flows/suggest-subtasks";
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
import { conditionalToast } from "@/lib/toast-utils";
import "./clear-selection.css"; // Custom styles for category clear button
import "./category-green.css"; // Custom styles for green hover/focus
import { AppHeader } from "@/components/app-header";
import { TaskCreator } from "@/components/task-creator";
import { TaskCardList } from "@/components/task-card-list";

import type { Task } from "./types/task";

const defaultTasks: Task[] = [
  {
    id: "default-1",
    title: "Explore TaskWise features",
    description: "Get acquainted with TaskWise's capabilities",
    category: "Other",
    priority: 50,
    deadline: new Date("2025-08-01"),
    subtasks: [
      { id: "default-1-subtask-a", title: "Explore categories", completed: false },
      { id: "default-1-subtask-b", title: "Create custom category", completed: false },
      { id: "default-1-subtask-c", title: "Explore subtasks auto-generation", completed: false },
    ],
    completed: false,
  },
];

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
function TaskWiseApp() {
  const searchParams = useSearchParams();

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
  
  useEffect(() => {
    async function loadTasks() {
      // Initialize default task deletion status flag outside try block for proper scope
      let defaultTaskDeleted = false;
      
      try {
        // First, always check if the default task was deleted
        try {
          const defaultTaskDeletedSetting = await UserSettingsApi.getSetting('defaultTaskDeleted');
          defaultTaskDeleted = defaultTaskDeletedSetting === 'true';
        } catch (settingsError) {
          // If we can't check the setting, assume the default task wasn't deleted
        }
        
        // Then fetch tasks from API
        const apiTasks = await TaskApi.getAllTasks();
        
        if (apiTasks && apiTasks.length > 0) {
          // If there are API tasks, use them regardless of default task status
          setHistory([apiTasks]);
          setHistoryIndex(0);
          conditionalToast({ title: "Tasks loaded from database" }, "load_tasks");
        } else {
          // No tasks from API, determine what to do
          if (defaultTaskDeleted) {
            // If default task was deleted, start with empty task list
            setHistory([[]]);
            setHistoryIndex(0);
          } else {
            // If default task wasn't deleted, use default tasks
            setHistory([defaultTasks]);
            setHistoryIndex(0);
          }
        }
      } catch (error) {
        console.error("Error loading tasks from API:", error);

        // Even in error case, respect the default task deletion preference
        if (defaultTaskDeleted) {
          setHistory([[]]);
          setHistoryIndex(0);
          toast({ 
            title: "Error loading tasks", 
            description: "Could not load any tasks",
            variant: "destructive"
          });
        } else {
          // Use default tasks as fallback only if they weren't deleted
          setHistory([defaultTasks]);
          setHistoryIndex(0);
          toast({ 
            title: "Error loading tasks", 
            description: "Using default tasks",
            variant: "destructive"
          });
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTasks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  
  // Wrap pushHistory — individual task operations already call the API directly
  const pushHistory = (newTasksState: Task[]) => {
    originalPushHistory(newTasksState);
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
    async function loadCategories() {
      // First, get the built-in category icons
      const categoryIconsToLoad = { ...initialCategoryIcons };

      try {
        // Try to load categories from the database
        const apiCategories = await CategoryApi.getAllCategories();

        if (apiCategories && Object.keys(apiCategories).length > 0) {
          // Merge API categories with built-in ones (API categories take precedence)
          const mergedCategories = { ...categoryIconsToLoad, ...apiCategories };
          
          setLoadedCategoryIcons(mergedCategories);
          conditionalToast({ 
            title: "Categories loaded from database", 
            description: `Loaded ${Object.keys(apiCategories).length} categories`
          }, "load_categories");
        } else {
          setLoadedCategoryIcons(categoryIconsToLoad);
        }
      } catch (error) {
        console.error('Error loading categories from API:', error);
        setLoadedCategoryIcons(categoryIconsToLoad);
        toast({ 
          title: "Error loading custom categories", 
          description: "Using default categories only",
          variant: "destructive"
        });
      }
    }
    
    loadCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const {
    categoryIconsState, setCategoryIconsState,
    selectedCategory, setSelectedCategory,
    isManageCategoriesOpen, setIsManageCategoriesOpen,
    handleDeleteCategory: originalHandleDeleteCategory,
    handleCategorySelect,
  } = useCategoryActions({
    initialCategoryIcons: loadedCategoryIcons,
    builtInCategories,
    tasks,
    pushHistory,
  });
  // Removed customCategory and customCategoryEmoji state. Only use modal props now.
  
  // Wrap category handlers to save to localStorage
  const handleCreateCategory = async (category: string, emoji: string) => {
    
    // Save to database using API
    try {
      const success = await CategoryApi.saveCategory(category, emoji);
      if (success) {
        // Update UI state after successful API call
        const updatedIcons = { ...categoryIconsState, [category]: emoji };
        setCategoryIconsState(updatedIcons);
        setSelectedCategory(category);
        
        conditionalToast({ title: "Custom category created", description: `${emoji} ${category}` }, "create_category");
      } else {
        toast({ 
          title: "Failed to create category", 
          description: "The operation couldn't be completed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Error saving category "${category}":`, error);
      toast({ 
        title: "Error creating category", 
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteCategory = async (category: string) => {
    // Delete from database using API
    try {
      const success = await CategoryApi.deleteCategory(category);
      if (success) {
        // Update the state only after successful API call
        // Then update local state
        setCategoryIconsState(prevState => {
          const newState = { ...prevState };
          delete newState[category];
          return newState;
        });
        
        // Update tasks with this category to 'Other'
        const updatedTasks = tasks.map(task =>
          task.category === category ? { ...task, category: "Other" } : task
        );
        
        // Update task state
        pushHistory(updatedTasks);
        
        // Also clear selected category if it was the deleted one
        if (selectedCategory === category) {
          setSelectedCategory(undefined);
        }
        
        conditionalToast({ title: "Custom category deleted", description: category }, "delete_category");
      } else {
        toast({ 
          title: "Failed to delete category", 
          description: "The operation couldn't be completed", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error(`Error deleting category "${category}":`, error);
      toast({ 
        title: "Error deleting category", 
        description: "An unexpected error occurred", 
        variant: "destructive" 
      });
    }
  };

  // Date picker state and logic from custom hook
  // Handles selected date, clearing, and today check
  const {
    selectedDate, setSelectedDate
  } = useDatePicker(new Date());

  // Check for admin_required error parameter
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error === 'admin_required') {
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to access the admin dashboard.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsAiLoading(true);

    // Create initial task object for new task entry
    let taskCategory = selectedCategory; // Use selected category if available
    // Gather all categories (built-in + custom)
    const allCategories = Object.keys(categoryIconsState);
    const newTask: Task = {
      id: Date.now().toString(), // Will be replaced by database-generated ID
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
        try {
          // If no category selected, use AI to suggest one from all categories (built-in + custom)
          const aiCategory = await categorizeTask({
            taskDescription: newTask.title,
            categories: allCategories,
          });
          newTask.category = aiCategory.category;
        } catch (error) {
          console.error("AI categorization failed:", error);
          newTask.category = "Other"; // Default fallback
          toast({
            title: "AI categorization unavailable",
            description: "Using 'Other' category. Check your API key in settings.",
            variant: "destructive"
          });
        }
      }

      // Ensure we have a category for prioritization (default to "Other" if AI fails)
      const categoryForPrioritization = newTask.category || "Other";

      // --- AI Prioritization & Subtasks ---
      let priorityResult, subtasksResult;
      
      try {
        // Run AI flows for priority score and subtask suggestions in parallel
        [priorityResult, subtasksResult] = await Promise.all([
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
      } catch (error) {
        console.error("AI prioritization or subtasks generation failed:", error);
        // Create fallback values
        priorityResult = { priorityScore: 50, reasoning: "Default priority (AI unavailable)" };
        subtasksResult = { subtasks: [] };
        
        toast({
          title: "AI features unavailable",
          description: "Using default values. Check your API key in settings.",
          variant: "destructive"
        });
      }

      // Update task with AI results (priority and subtasks)
      newTask.priority = priorityResult.priorityScore;
      newTask.subtasks = subtasksResult.subtasks.map((subtaskTitle, index) => ({
        id: `${newTask.id}-subtask-${index}`,
        title: subtaskTitle,
        completed: false,
      }));

      // Save task to database using API
      try {
        const createdTask = await TaskApi.createTask(newTask);
        if (createdTask) {
          // Use the returned task with database ID
          pushHistory([...tasks, createdTask]);
        } else {
          // Fallback to local state only
          pushHistory([...tasks, newTask]);
        }
      } catch (apiError) {
        // Fallback to local state only if API fails
        pushHistory([...tasks, newTask]);
        
        toast({
          title: "Database error",
          description: "Task saved locally only, may not persist across devices",
          variant: "destructive"
        });
      }

      // Reset form inputs for next task entry
      setNewTaskTitle("");
      setSelectedDate(new Date());
      setSelectedCategory(undefined);

      conditionalToast({ title: "Task added successfully!", description: `"${newTask.title}" has been added to your list.` }, "create_task");
    } catch (err) {
      console.error("Error adding task:", err);
      toast({
        title: "Failed to add task",
        description: "An error occurred while processing your task.",
        variant: "destructive"
      });
    } finally {
      setIsAiLoading(false);
    }
  };


  return (
    <div className="container mx-auto p-4">
      {/* Header row with theme toggle removed; trashcan now in layout */}
      <div className="mb-2" />
      <Card className="relative">
        <AppHeader />
        <CardContent>
          <TaskCreator
            newTaskTitle={newTaskTitle}
            onNewTaskTitleChange={setNewTaskTitle}
            onAddTask={handleAddTask}
            isLoading={isLoading}
            isAiLoading={isAiLoading}
            categoryIcons={categoryIconsState}
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            onClearCategory={() => setSelectedCategory(undefined)}
            builtInCategories={builtInCategories}
            isManageCategoriesOpen={isManageCategoriesOpen}
            onManageCategoriesOpenChange={setIsManageCategoriesOpen}
            onDeleteCategory={handleDeleteCategory}
            isCreateCategoryOpen={isCreateCategoryOpen}
            onCreateCategoryOpenChange={setIsCreateCategoryOpen}
            onCreateCategory={handleCreateCategory}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <TaskCardList
            tasks={tasks}
            isLoading={isLoading}
            editingTaskId={editingTaskId}
            categoryIcons={categoryIconsState}
            onTaskCompletion={handleTaskCompletion}
            onSubtaskCompletion={handleSubtaskCompletion}
            onEditTask={handleEditTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onCancelEdit={() => setEditingTaskId(null)}
            setCategoryIcons={setCategoryIconsState}
            isCreateCategoryOpen={isCreateCategoryOpen}
            setIsCreateCategoryOpen={setIsCreateCategoryOpen}
            onCreateCategory={handleCreateCategory}
          />
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
          <AlertDialogCancel onClick={cancelDiscard} className="category-clear-btn">Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Main component that wraps the app with Suspense
export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen p-4">
        <p>Loading...</p>
      </div>
    }>
      <TaskWiseApp />
    </Suspense>
  );
}

