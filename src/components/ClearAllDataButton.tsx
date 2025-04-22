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

export function ClearAllDataButton() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleClear = () => {
    clearAllData();
    toast({ title: "All TaskWise data deleted" });
    setOpen(false);
    // Optionally, reload the page or trigger a state update if needed
    window.location.reload();
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
      >
        <Icons.trash className="h-5 w-5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all TaskWise data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your tasks, categories, and settings from this browser. This cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleClear}>
            Delete Everything
          </AlertDialogAction>
          <AlertDialogCancel className="text-white hover:text-destructive hover:bg-destructive/10">Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
