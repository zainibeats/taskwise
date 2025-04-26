"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { clearAllData } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { TaskApi, CategoryApi } from "@/lib/api-client";

export function ClearAllDataButton() {
  const [open, setOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleClear = async () => {
    setIsClearing(true);
    
    try {
      // Clear localStorage first
      clearAllData();
      
      // Clear database - get all tasks and delete them
      const tasks = await TaskApi.getAllTasks();
      console.log("[DEBUG] Found tasks to delete:", tasks.length);
      
      // Delete all tasks in parallel
      if (tasks.length > 0) {
        await Promise.all(
          tasks.map(task => TaskApi.deleteTask(task.id))
        );
        console.log("[DEBUG] Deleted all tasks from database");
      }
      
      // Clear custom categories
      const categories = await CategoryApi.getAllCategories();
      const customCategoryNames = Object.keys(categories).filter(
        // Only delete custom categories, not built-in ones
        name => !["Work", "Home", "Errands", "Personal", "Health", 
                "Finance", "Education", "Social", "Travel", "Other"].includes(name)
      );
      
      if (customCategoryNames.length > 0) {
        await Promise.all(
          customCategoryNames.map(name => CategoryApi.deleteCategory(name))
        );
        console.log("[DEBUG] Deleted custom categories from database:", customCategoryNames);
      }
      
      toast({ 
        title: "All TaskWise data deleted",
        description: "Both local and database data has been cleared" 
      });
    } catch (error) {
      console.error("[DEBUG] Error clearing database data:", error);
      toast({ 
        title: "Local data deleted", 
        description: "Could not clear database data" 
      });
    } finally {
      setIsClearing(false);
      setOpen(false);
      // Reload the page to reflect changes
      window.location.reload();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="category-clear-btn"
        title="Delete all TaskWise data"
        aria-label="Delete all data"
        onClick={() => setOpen(true)}
        disabled={isClearing}
      >
        <Icons.trash className="h-5 w-5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all TaskWise data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your tasks, categories, and settings from both your browser and the database. This cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction 
            className="bg-destructive text-white hover:bg-destructive/90" 
            onClick={handleClear}
            disabled={isClearing}
          >
            {isClearing ? "Deleting..." : "Delete Everything"}
          </AlertDialogAction>
          <AlertDialogCancel 
            className="text-foreground hover:text-destructive hover:bg-destructive/10"
            disabled={isClearing}
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
