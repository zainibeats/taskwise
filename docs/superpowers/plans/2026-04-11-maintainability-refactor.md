# TaskWise Maintainability Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the vibecoded TaskWise app into a maintainable codebase that AI agents and humans can confidently work on.

**Architecture:** Component-first refactor — consolidate types first, then decompose the 1057-line `page.tsx` monolith into focused components, remove the dual DB architecture, clean up the API client, and strip unused dependencies and debug logging.

**Tech Stack:** Next.js 15.3.1, React 18, TypeScript 5, SQLite (better-sqlite3), Genkit 1.7.0 (Gemini), Shadcn UI, Tailwind CSS 3.4.1

---

## File Structure

### New files:
- `src/components/app-header.tsx` — logo, title, description, settings, theme toggle, clear data button
- `src/components/task-creator.tsx` — new task input, category selector, date picker, add button, history controls
- `src/components/category-manager.tsx` — manage categories modal + create category integration
- `src/lib/api-fetch.ts` — shared `apiFetch()` helper for API client

### Modified files:
- `src/app/page.tsx` — reduce to ~100-line orchestrator
- `src/app/types/task.ts` — canonical Task, Subtask, Category, UserSettings types
- `src/app/types/index.ts` — re-export from task.ts (backward compat)
- `src/lib/api-client.ts` — refactor to use `apiFetch()`, ~200 lines
- `src/lib/db.ts` — remove `fetchFromService`, `dbService`, `isDevelopment` branching
- `src/lib/task-service.ts` — remove all `isDevelopment`/`dbService` branching
- `src/components/task-list.tsx` — use canonical types, add loading/empty states from page.tsx
- `src/components/task-item.tsx` — use canonical types, integrate inline task rendering from page.tsx
- `src/components/TaskEditForm.tsx` — use canonical types, remove dead code
- `src/app/hooks/useCategoryActions.ts` — remove debug console.logs
- `next.config.ts` — remove API rewrites for DB service
- `package.json` — remove unused deps and scripts

### Deleted files:
- `db/connection.js` — redundant HTTP DB service (971 lines)
- `db/README.md` — docs for the deleted service
- `src/lib/storage.ts` — redirect layer, only 2 consumers
- `src/components/ui/chart.tsx` — recharts wrapper, unused

---

## Task 1: Type System Consolidation

**Files:**
- Modify: `src/app/types/task.ts`
- Modify: `src/app/types/index.ts`

This task creates a single canonical type system. The frontend uses camelCase everywhere; the API layer handles snake_case conversion.

- [ ] **Step 1: Update `src/app/types/task.ts` with all canonical types**

```typescript
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: number;
  deadline?: Date | undefined;
  subtasks?: Subtask[];
  completed: boolean;
}

export interface Category {
  id?: number;
  name: string;
  icon: string;
  userId?: number;
}

export interface UserSettings {
  id?: number;
  userId: number;
  key: string;
  value?: string;
}
```

- [ ] **Step 2: Update `src/app/types/index.ts` to re-export from task.ts**

Replace the entire file with:

```typescript
// Canonical types — all defined in task.ts
export { type Task, type Subtask, type Category, type UserSettings } from './task';
```

- [ ] **Step 3: Fix imports in `src/lib/task-service.ts`**

The file imports `Task, Subtask, Category` from `../app/types` (the old snake_case types). Update the import but don't change the service logic yet — that happens in Task 4.

Change line 2:
```typescript
import type { Task as DbTask, Subtask as DbSubtask, Category as DbCategory } from '../app/types';
```

This aliases the types since `task-service.ts` works with DB-format data internally. The actual DB consolidation (Task 4) will clean this up fully.

- [ ] **Step 4: Verify no other files import the old snake_case types directly**

Run: `grep -rn "from.*types/index\|from.*types\"" src/ --include="*.ts" --include="*.tsx"`

Check that all consumers either import from `./types/task` or `./types` (which now re-exports). The only file that should need attention is `task-service.ts` (handled in step 3).

- [ ] **Step 5: Remove duplicate type definitions from components**

Both `src/components/task-list.tsx` and `src/components/task-item.tsx` define their own `Task` and `SubTask` interfaces locally. Replace these with imports from the canonical types.

In `src/components/task-list.tsx`, remove lines 4-21 (the local interfaces) and add at the top:
```typescript
import type { Task } from '@/app/types/task';
```

Update `TaskListProps` to use the canonical `Task` type (same shape, just imported).

In `src/components/task-item.tsx`, remove lines 13-28 (the local interfaces) and add at the top:
```typescript
import type { Task } from '@/app/types/task';
```

- [ ] **Step 6: Commit**

```bash
git add src/app/types/task.ts src/app/types/index.ts src/lib/task-service.ts src/components/task-list.tsx src/components/task-item.tsx
git commit -m "refactor: consolidate type system into single canonical camelCase types"
```

---

## Task 2: Component Decomposition — AppHeader

**Files:**
- Create: `src/components/app-header.tsx`
- Modify: `src/app/page.tsx`

Extract the header section (logo, title, description, settings menu, theme toggle, clear data button) from `page.tsx` lines 664-681.

- [ ] **Step 1: Create `src/components/app-header.tsx`**

```typescript
"use client";

import Image from 'next/image';
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/theme-toggle";
import { ClearAllDataButton } from "@/components/ClearAllDataButton";
import { SettingsMenu } from "@/components/settings-menu";

export function AppHeader() {
  return (
    <>
      <div className="absolute top-6 right-6 z-10 flex items-center space-x-2">
        <SettingsMenu />
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
    </>
  );
}
```

- [ ] **Step 2: Replace header in `page.tsx`**

Add import:
```typescript
import { AppHeader } from "@/components/app-header";
```

Replace lines 665-681 (the settings buttons div and CardHeader) with:
```tsx
<AppHeader />
```

Remove now-unused imports from page.tsx: `Image` from `next/image`, `ModeToggle`, `ClearAllDataButton`, `SettingsMenu`, `CardDescription`, `CardTitle`.

- [ ] **Step 3: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`

If there are type errors, fix them before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/components/app-header.tsx src/app/page.tsx
git commit -m "refactor: extract AppHeader component from page.tsx"
```

---

## Task 3: Component Decomposition — TaskCreator

**Files:**
- Create: `src/components/task-creator.tsx`
- Create: `src/components/category-manager.tsx`
- Modify: `src/app/page.tsx`

Extract the task creation form (input, category selector, date picker, add button, history controls) and the manage categories modal from `page.tsx`.

- [ ] **Step 1: Create `src/components/category-manager.tsx`**

This component handles the "Manage Custom Categories" modal (page.tsx lines 793-829).

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryIcons: Record<string, string>;
  builtInCategories: string[];
  onDeleteCategory: (category: string) => void;
}

export function CategoryManager({
  open,
  onOpenChange,
  categoryIcons,
  builtInCategories,
  onDeleteCategory,
}: CategoryManagerProps) {
  const customCategories = Object.entries(categoryIcons).filter(
    ([cat]) => !builtInCategories.includes(cat)
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Manage Custom Categories</AlertDialogTitle>
          <AlertDialogDescription>
            Delete any custom category you no longer need. Built-in categories cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mt-2">
          {customCategories.length === 0 && (
            <span className="text-muted-foreground text-sm">No custom categories found.</span>
          )}
          {customCategories.map(([category, icon]) => (
            <div key={category} className="flex items-center justify-between p-2 rounded hover:bg-muted">
              <span className="flex items-center gap-2">{icon} {category}</span>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label={`Delete ${category}`}
                onClick={(e) => {
                  e.preventDefault();
                  onDeleteCategory(category);
                }}
              >
                <Icons.trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <AlertDialogCancel className="mt-4 category-clear-btn">Close</AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Create `src/components/task-creator.tsx`**

This extracts the entire task creation bar (page.tsx lines 683-848): input, category select, clear selection, manage categories button, date picker, add task button, and history controls.

```typescript
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Icons } from "@/components/icons";
import { HistoryControls } from "@/components/history-controls";
import { CreateCategoryModal } from "@/components/CreateCategoryModal";
import { CategoryManager } from "@/components/category-manager";

interface TaskCreatorProps {
  // Task input
  newTaskTitle: string;
  onNewTaskTitleChange: (title: string) => void;
  onAddTask: () => void;
  isLoading: boolean;
  isAiLoading: boolean;
  // Category
  categoryIcons: Record<string, string>;
  selectedCategory: string | undefined;
  onCategorySelect: (value: string) => void;
  onClearCategory: () => void;
  builtInCategories: string[];
  isManageCategoriesOpen: boolean;
  onManageCategoriesOpenChange: (open: boolean) => void;
  onDeleteCategory: (category: string) => void;
  isCreateCategoryOpen: boolean;
  onCreateCategoryOpenChange: (open: boolean) => void;
  onCreateCategory: (category: string, emoji: string) => void;
  // Date
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  // History
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function TaskCreator({
  newTaskTitle,
  onNewTaskTitleChange,
  onAddTask,
  isLoading,
  isAiLoading,
  categoryIcons,
  selectedCategory,
  onCategorySelect,
  onClearCategory,
  builtInCategories,
  isManageCategoriesOpen,
  onManageCategoriesOpenChange,
  onDeleteCategory,
  isCreateCategoryOpen,
  onCreateCategoryOpenChange,
  onCreateCategory,
  selectedDate,
  onDateChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: TaskCreatorProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 max-w-full overflow-hidden">
      <Input
        type="text"
        placeholder="Add a task..."
        value={newTaskTitle}
        onChange={(e) => onNewTaskTitleChange(e.target.value)}
        className="flex-grow"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLoading && !isAiLoading) {
            onAddTask();
          }
        }}
      />
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 w-full sm:w-auto">
        <div className="category-green-select">
          <Select
            key={selectedCategory ?? 'no-selection'}
            onValueChange={(value) => {
              if (value === 'create_new') {
                onCreateCategoryOpenChange(true);
                return;
              }
              onCategorySelect(value);
            }}
            value={selectedCategory}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="max-h-56 overflow-y-auto">
              {Object.entries(categoryIcons).map(([category, icon]) => (
                <SelectItem key={category} value={category}>
                  {icon} {category}
                </SelectItem>
              ))}
              <SelectItem value="create_new">
                Create New
              </SelectItem>
            </SelectContent>
          </Select>
          <CreateCategoryModal
            open={isCreateCategoryOpen}
            onOpenChange={onCreateCategoryOpenChange}
            onCreate={onCreateCategory}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onClearCategory}
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
          onClick={() => onManageCategoriesOpenChange(true)}
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
            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col items-center gap-2 p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateChange}
              disabled={(date) => date < new Date()}
              initialFocus
            />
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2 category-clear-btn"
              onClick={() => onDateChange(new Date())}
              disabled={!selectedDate || (selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))}
            >
              Clear Selection
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <CategoryManager
        open={isManageCategoriesOpen}
        onOpenChange={onManageCategoriesOpenChange}
        categoryIcons={categoryIcons}
        builtInCategories={builtInCategories}
        onDeleteCategory={onDeleteCategory}
      />

      <Button onClick={onAddTask} disabled={isLoading || isAiLoading}>
        {(isLoading || isAiLoading) ? (
          <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          "Add Task"
        )}
      </Button>
      <HistoryControls
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update `page.tsx` to use TaskCreator**

Add import:
```typescript
import { TaskCreator } from "@/components/task-creator";
```

Replace the entire `<div className="mb-4 flex flex-wrap items-center gap-2 ...">` block (lines 683-848) with:
```tsx
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
```

Remove now-unused imports from page.tsx: `Input`, `Calendar`, `Popover`, `PopoverContent`, `PopoverTrigger`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `format`, `cn`, `HistoryControls`, `CreateCategoryModal`, `ScrollArea`.

Also remove the `EmojiPicker` component (lines 999-1027) and `AlertDialogFooter` component (lines 1028-1042) from page.tsx — they are dead code.

- [ ] **Step 4: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 5: Commit**

```bash
git add src/components/task-creator.tsx src/components/category-manager.tsx src/app/page.tsx
git commit -m "refactor: extract TaskCreator and CategoryManager components from page.tsx"
```

---

## Task 4: Component Decomposition — Inline Task List in page.tsx

**Files:**
- Modify: `src/app/page.tsx`

Extract the task list rendering (page.tsx lines 855-967) — the `<ul>` that maps over tasks and renders each task card with completion, editing, priority badges, subtasks, and edit/delete buttons.

This does NOT use the existing `task-list.tsx` or `task-item.tsx` (which are stubs with their own local types and different UI). Instead, we create a new component that matches the actual page.tsx rendering.

- [ ] **Step 1: Create `src/components/task-card.tsx`**

This is the per-task card rendering extracted from page.tsx lines 864-959:

```typescript
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
  // Category editing props passed through to TaskEditForm
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
                    <li
                      key={subtask.id}
                      className="text-xs flex items-center space-x-4"
                    >
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
                        style={{
                          textDecoration: subtask.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {subtask.title}
                      </Label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => onEditTask(task)}
                disabled={task.completed}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDeleteTask(task.id)}
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `src/components/task-card-list.tsx`**

This wraps the loading state, empty state, and task card mapping:

```typescript
"use client";

import React from "react";
import type { Task } from "@/app/types/task";
import { TaskCard } from "@/components/task-card";

interface TaskCardListProps {
  tasks: Task[];
  isLoading: boolean;
  editingTaskId: string | null;
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

export function TaskCardList({
  tasks,
  isLoading,
  editingTaskId,
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
}: TaskCardListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-2">Loading tasks...</span>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No tasks yet. Create your first task above!</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 mt-4">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            isEditing={editingTaskId === task.id}
            categoryIcons={categoryIcons}
            onTaskCompletion={onTaskCompletion}
            onSubtaskCompletion={onSubtaskCompletion}
            onEditTask={onEditTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onCancelEdit={onCancelEdit}
            setCategoryIcons={setCategoryIcons}
            isCreateCategoryOpen={isCreateCategoryOpen}
            setIsCreateCategoryOpen={setIsCreateCategoryOpen}
            onCreateCategory={onCreateCategory}
          />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Update `page.tsx` to use TaskCardList**

Add import:
```typescript
import { TaskCardList } from "@/components/task-card-list";
```

Replace the entire `<ul className="space-y-2 mt-4">` block (lines 855-967) with:
```tsx
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
```

Remove now-unused imports from page.tsx: `Badge`, `Checkbox`, `Label`, `Textarea`, `lazy`, `Suspense` (the lazy TaskEditForm import), `format`, `isPast`, `cn`.

- [ ] **Step 4: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 5: Commit**

```bash
git add src/components/task-card.tsx src/components/task-card-list.tsx src/app/page.tsx
git commit -m "refactor: extract TaskCard and TaskCardList components from page.tsx"
```

---

## Task 5: Database Consolidation

**Files:**
- Delete: `db/connection.js`
- Delete: `db/README.md`
- Modify: `src/lib/db.ts`
- Modify: `src/lib/task-service.ts`
- Modify: `next.config.ts`
- Modify: `package.json`

Remove the dual DB architecture. Keep only direct SQLite via better-sqlite3.

- [ ] **Step 1: Clean up `src/lib/db.ts`**

Remove `fetchFromService` function (lines 12-35), `isDevelopment` constant (line 6), the development warning in `getDbConnection` (lines 42-47), and the entire `dbService` export (lines 224-266).

The file should contain only:
1. `getDbConnection()` — singleton database connection (no isDevelopment check)
2. `initDb()` — table creation
3. `migrateExistingData()` — migrations
4. Process exit handler

Specifically:
- Remove line 6: `const isDevelopment = ...`
- Remove lines 12-35: `fetchFromService` function
- Remove lines 42-47: the `if (isDevelopment)` warning block inside `getDbConnection`
- Remove lines 224-266: the `dbService` export
- Keep the `export default getDbConnection` at the end

- [ ] **Step 2: Clean up `src/lib/task-service.ts`**

Remove all `isDevelopment` branching. Each method should only have the direct SQLite path.

- Remove line 1 import of `dbService`: change `import getDbConnection, { dbService } from './db'` to `import getDbConnection from './db'`
- Remove line 2 import of old types and use the DB column names directly (the service works with DB-format data)
- Remove line 8: `const isDevelopment = ...`
- In every method, remove the `if (isDevelopment) { return dbService.xxx(...) }` block. Keep only the direct SQLite code after it.

Methods to clean: `getAllTasks`, `getTaskById`, `createTask`, `updateTask`, `deleteTask`, `toggleTaskCompletion`, `getAllCategories`, `saveCategory`, `deleteCategory`.

- [ ] **Step 3: Remove API rewrites from `next.config.ts`**

Remove the entire `async rewrites()` block (lines 13-19). The file should keep `typescript.ignoreBuildErrors`, `eslint.ignoreDuringBuilds`, and the `webpack` configuration.

- [ ] **Step 4: Clean up `package.json` scripts**

Remove these scripts:
- `"dev:with-db"` (line 8)
- `"db:start"` (line 9)
- `"docker:dev"` (line 10) — references docker-compose.dev.yml which doesn't exist
- `"start:with-db"` (line 18)

- [ ] **Step 5: Delete `db/connection.js` and `db/README.md`**

```bash
rm db/connection.js db/README.md
rmdir db 2>/dev/null || true
```

- [ ] **Step 6: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove dual DB architecture, keep only direct SQLite"
```

---

## Task 6: API Client Cleanup

**Files:**
- Create: `src/lib/api-fetch.ts`
- Modify: `src/lib/api-client.ts`
- Delete: `src/lib/storage.ts`
- Modify: `src/app/page.tsx` (remove storage import)
- Modify: `src/components/ClearAllDataButton.tsx` (remove storage import)

- [ ] **Step 1: Create `src/lib/api-fetch.ts`**

Shared fetch helper that handles auth, errors, JSON parsing, and snake_case/camelCase conversion:

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const API_BASE_URL = typeof window !== 'undefined'
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100/api');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: { method?: HttpMethod; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', body } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API ${method} ${path} failed: ${response.status}`);
  }

  // DELETE responses may have no body
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// --- Snake/Camel conversion helpers ---

interface DbTask {
  id: number;
  title: string;
  description?: string;
  deadline?: string;
  importance?: number;
  category?: string;
  priority_score?: number;
  is_completed: boolean;
  created_at?: string;
  subtasks?: DbSubtask[];
}

interface DbSubtask {
  id: number;
  task_id: number;
  description: string;
  is_completed: boolean;
}

import type { Task, Subtask } from '@/app/types/task';

export function dbTaskToFrontend(raw: DbTask): Task {
  return {
    ...raw,
    id: String(raw.id),
    subtasks: raw.subtasks?.map(dbSubtaskToFrontend) ?? [],
    deadline: raw.deadline ? new Date(raw.deadline) : undefined,
    completed: raw.is_completed,
    priority: raw.priority_score,
  };
}

function dbSubtaskToFrontend(raw: DbSubtask): Subtask {
  return {
    id: String(raw.id),
    title: raw.description,
    completed: raw.is_completed,
  };
}

export function frontendTaskToDb(task: Partial<Task>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (task.title !== undefined) result.title = task.title;
  if (task.description !== undefined) result.description = task.description;
  if (task.deadline !== undefined) result.deadline = task.deadline?.toISOString();
  if (task.category !== undefined) result.category = task.category;
  if (task.priority !== undefined) result.priority_score = task.priority;
  if (task.completed !== undefined) result.is_completed = task.completed;
  if (task.subtasks !== undefined) {
    result.subtasks = task.subtasks.map((s) => ({
      description: s.title,
      is_completed: s.completed || false,
    }));
  }
  return result;
}
```

- [ ] **Step 2: Rewrite `src/lib/api-client.ts`**

Replace the entire 477-line file with thin wrappers using `apiFetch`:

```typescript
import type { Task } from '@/app/types/task';
import { apiFetch, dbTaskToFrontend, frontendTaskToDb } from './api-fetch';

export const TaskApi = {
  async getAllTasks(): Promise<Task[]> {
    const raw = await apiFetch<any[]>('/tasks');
    return raw.map(dbTaskToFrontend);
  },

  async createTask(task: Omit<Task, 'id'>): Promise<Task | null> {
    try {
      const raw = await apiFetch<any>('/tasks', {
        method: 'POST',
        body: frontendTaskToDb(task as Partial<Task>),
      });
      return dbTaskToFrontend(raw);
    } catch {
      return null;
    }
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      const raw = await apiFetch<any>(`/tasks/${parseInt(taskId, 10)}`, {
        method: 'PUT',
        body: frontendTaskToDb(updates),
      });
      return dbTaskToFrontend(raw);
    } catch {
      return null;
    }
  },

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await apiFetch(`/tasks/${parseInt(taskId, 10)}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  },

  async toggleTaskCompletion(taskId: string): Promise<Task | null> {
    try {
      const raw = await apiFetch<any>(`/tasks/${parseInt(taskId, 10)}`, { method: 'PATCH' });
      return dbTaskToFrontend(raw);
    } catch {
      return null;
    }
  },
};

export const CategoryApi = {
  async getAllCategories(): Promise<Record<string, string>> {
    try {
      const categories = await apiFetch<{ name: string; icon: string }[]>('/categories');
      const result: Record<string, string> = {};
      categories.forEach((c) => { result[c.name] = c.icon; });
      return result;
    } catch {
      return {};
    }
  },

  async saveCategory(name: string, icon: string): Promise<boolean> {
    try {
      await apiFetch('/categories', { method: 'POST', body: { name, icon } });
      return true;
    } catch {
      return false;
    }
  },

  async deleteCategory(name: string): Promise<boolean> {
    try {
      await apiFetch(`/categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  },
};

export const UserSettingsApi = {
  async getAllSettings(): Promise<Record<string, string>> {
    try {
      return await apiFetch<Record<string, string>>('/user-settings');
    } catch {
      return {};
    }
  },

  async getSetting(key: string): Promise<string | null> {
    try {
      const result = await apiFetch<{ value: string }>(`/user-settings/${encodeURIComponent(key)}`);
      return result.value;
    } catch {
      return null;
    }
  },

  async saveSetting(key: string, value: string): Promise<boolean> {
    try {
      await apiFetch('/user-settings', { method: 'POST', body: { key, value } });
      return true;
    } catch {
      return false;
    }
  },

  async deleteSetting(key: string): Promise<boolean> {
    try {
      await apiFetch(`/user-settings/${encodeURIComponent(key)}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  },
};
```

- [ ] **Step 3: Delete `src/lib/storage.ts` and update its consumers**

Delete the file. Then update the two consumers:

In `src/app/page.tsx`, remove the import on line 5:
```typescript
import { getStoredTasks, saveTasks } from "@/lib/storage";
```

The `getStoredTasks` call is not used in the current page.tsx (tasks are loaded via `TaskApi.getAllTasks()` directly). The `saveTasks` call in the `pushHistory` wrapper (line 261) should be replaced with inline logic or removed — the individual task operations already call the API directly via `useTaskActions`. Remove the `saveTasks(newTasksState)` call from the `pushHistory` wrapper, keeping only `originalPushHistory(newTasksState)`.

In `src/components/ClearAllDataButton.tsx`, replace the import:
```typescript
import { clearAllData } from "@/lib/storage";
```
with the equivalent inline logic using `TaskApi` and `CategoryApi` directly (which is what `clearAllData` does internally).

- [ ] **Step 4: Delete `src/lib/storage.ts`**

```bash
rm src/lib/storage.ts
```

- [ ] **Step 5: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: create shared apiFetch helper, simplify API client, remove storage.ts"
```

---

## Task 7: Dependency & Logging Cleanup

**Files:**
- Modify: `package.json`
- Delete: `src/components/ui/chart.tsx`
- Modify: Multiple files (remove console.log/console.error debug statements)
- Modify: `src/lib/debug.ts` (keep but simplify)

- [ ] **Step 1: Remove unused dependencies from `package.json`**

Remove from `dependencies`:
- `"firebase": "^11.3.0"` — not imported anywhere in src/
- `"next-auth": "^4.24.6"` — not imported anywhere in src/
- `"recharts": "^2.15.1"` — only used by chart.tsx which is unused
- `"@tanstack-query-firebase/react": "^1.0.5"` — not imported anywhere
- `"node-fetch": "^3.3.2"` — Node 18+ has native fetch
- `"patch-package": "^8.0.0"` — no patches directory exists

Remove from `devDependencies`:
- `"concurrently": "^9.1.2"` — was only used by the removed `dev:with-db` script

- [ ] **Step 2: Delete `src/components/ui/chart.tsx`**

This is the recharts wrapper — no component imports it.

```bash
rm src/components/ui/chart.tsx
```

- [ ] **Step 3: Strip debug console.log statements**

Remove all `console.log` calls that are debug/development noise. Keep `console.error` calls that log genuine error conditions. Remove all `debugLog` and `debugError` calls from non-library files (hooks, page, components).

Files to clean (remove console.log/debugLog calls):
- `src/app/page.tsx` — remove lines with `debugLog`, `console.log("[DEBUG]")`
- `src/app/hooks/useTaskActions.ts` — remove all `console.log("[DEBUG]")` and `console.error("[DEBUG]")` calls
- `src/app/hooks/useCategoryActions.ts` — remove all `console.log("[HOOK]")` calls
- `src/components/settings-menu.tsx` — keep only essential error handling, remove `debugLog` verification
- `src/components/task-item.tsx` — remove `console.error` in catch (it does nothing useful)

For `useTaskActions.ts` specifically: replace `console.log/console.error("[DEBUG]...")` calls with nothing. Keep the actual logic. The error handling toast calls should stay.

For `useCategoryActions.ts`: remove all 12 `console.log('[HOOK]...')` lines.

- [ ] **Step 4: Remove the debug import from cleaned files**

After removing all `debugLog`/`debugError` calls from a file, also remove the unused `import { debugLog, debugError } from "@/lib/debug"` line.

- [ ] **Step 5: Run `npm install` to update lockfile**

```bash
cd /workspace && npm install
```

- [ ] **Step 6: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove unused dependencies and debug logging"
```

---

## Task 8: Final Cleanup — Remove Dead Code from page.tsx

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/components/task-list.tsx` (the old stub)
- Delete: `src/components/task-item.tsx` (the old stub)

After Tasks 2-4, page.tsx should be significantly smaller. This task does a final pass.

- [ ] **Step 1: Delete old stub components**

The original `task-list.tsx` and `task-item.tsx` define their own local types and have different UI than what page.tsx actually renders. They're replaced by `task-card.tsx` and `task-card-list.tsx`.

```bash
rm src/components/task-list.tsx src/components/task-item.tsx
```

- [ ] **Step 2: Clean up remaining unused imports in `page.tsx`**

After all extractions, verify that page.tsx only imports what it actually uses. The file should import:
- React, useState, useEffect, useRef
- useRouter, useSearchParams from next/navigation
- TaskApi, CategoryApi, UserSettingsApi from api-client
- useUndoRedo, useTaskActions, useCategoryActions, useDatePicker hooks
- Card, CardContent from ui/card
- useToast, conditionalToast
- prioritizeTask, categorizeTask, suggestSubtasks (for handleAddTask)
- AppHeader, TaskCreator, TaskCardList components
- AlertDialog components (for discard modal)
- Task, Subtask types
- CSS imports

Remove anything else that was left behind from the extractions.

- [ ] **Step 3: Remove the `taskCategories` array (line 633-644)**

This array duplicates `builtInCategories` and is never used.

- [ ] **Step 4: Verify page.tsx is under ~200 lines**

Run: `wc -l src/app/page.tsx`

The file should now contain only:
1. Imports
2. `defaultTasks` constant
3. `initialCategoryIcons` constant
4. `builtInCategories` constant
5. Auth check effect
6. Task/category loading effects
7. Hook initializations
8. `handleAddTask` function
9. Category handler wrappers
10. Render: auth loading check, Card with AppHeader + TaskCreator + TaskCardList + discard AlertDialog
11. Home wrapper with Suspense

- [ ] **Step 5: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: final cleanup — remove dead code, old stubs, unused imports"
```

---

## Task 9: Remove `TaskEditForm` Dead Code

**Files:**
- Modify: `src/components/TaskEditForm.tsx`

- [ ] **Step 1: Remove dead code from TaskEditForm**

- Remove the `EmojiPicker` component (lines 37-65) — it's never rendered; the `CreateCategoryModal` handles emoji selection.
- Remove the `handleEmojiSelect` function (lines 95-98) — references `setCustomCategoryEmoji` and `setIsEmojiPickerOpen` which don't exist as state in this component.
- Remove the `AlertDialogFooter` component (lines 266-280) — unused local component.
- Remove unused imports: `AlertDialog`, `AlertDialogAction`, `AlertDialogDescription`, `AlertDialogHeader`, `AlertDialogTitle`, `ScrollArea`.
- Type the `task` prop properly: `task: Task` instead of `task: any`.
- Type the `onUpdate` prop: `onUpdate: (updatedTask: Partial<Task>) => void` instead of `Partial<any>`.

- [ ] **Step 2: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskEditForm.tsx
git commit -m "refactor: clean up TaskEditForm dead code and fix types"
```
