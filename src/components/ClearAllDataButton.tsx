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
import { useToast } from "@/hooks/use-toast";
import { debugLog, debugError } from "@/lib/debug";
import { clearAllData } from "@/lib/storage";

export function ClearAllDataButton() {
  const [open, setOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleClear = async () => {
    setIsClearing(true);
    
    try {
      // Use the centralized clearAllData utility function from storage.ts
      debugLog("Starting data clear operation");
      const success = await clearAllData();
      
      if (!success) {
        throw new Error("Data clear operation failed");
      }
      
      debugLog("Successfully cleared all data");
      
      toast({ 
        title: "All TaskWise data deleted",
        description: "Your data has been cleared from the database" 
      });
    } catch (error) {
      debugError("Error clearing database data:", error);
      toast({ 
        title: "Error", 
        description: "Could not clear database data",
        variant: "destructive"
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
              This will clear all your tasks, categories, and settings from the database. This cannot be undone. Are you sure?
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
