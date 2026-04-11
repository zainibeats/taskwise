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
  newTaskTitle: string;
  onNewTaskTitleChange: (title: string) => void;
  onAddTask: () => void;
  isLoading: boolean;
  isAiLoading: boolean;
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
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
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
