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
