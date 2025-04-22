"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Icons } from "@/components/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskEditFormProps {
  task: any;
  onUpdate: (updatedTask: Partial<any>) => void;
  onCancel: () => void;
  categoryIcons: { [key: string]: string };
  setCategoryIcons: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const emojis = ["💼", "📞", "💹", "🛠️", "✏️", "👨‍👩‍👧‍👦", "✈️", "🏖️", "🪴", "🍽️", "❤️", "📚", "🎞️", "⭐", "🌐", "🎉", "🐶", "🐱", "🧸", "⚽", "⚕️", "🏠", "💊", "📧", "💰"];

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

/**
 * TaskEditForm component allows editing of a task's details, including title, description,
 * category (with emoji), priority, and deadline. Also supports creating new categories with emoji.
 */
export function TaskEditForm({ task, onUpdate, onCancel, categoryIcons, setCategoryIcons }: TaskEditFormProps) {
  // Local state for each editable field
const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || ""); // Task description
  const [category, setCategory] = useState(task.category || ""); // Task category
  const [priority, setPriority] = useState(task.priority || 50); // Task priority (default 50)
  const [deadline, setDeadline] = useState<Date | undefined>(task.deadline); // Task deadline
  const [customCategory, setCustomCategory] = useState(""); // New category name input
  const [customCategoryEmoji, setCustomCategoryEmoji] = useState(""); // Emoji for new category
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false); // Emoji picker visibility
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false); // New category creation dialog


  // Save changes and propagate updated task details
const handleSave = () => {
    onUpdate({
      title,
      description,
      category,
      priority,
      deadline,
    });
  };

  // Create a new category with selected emoji and set as current
const handleCreateCategory = () => {
    if (customCategory.trim() && customCategoryEmoji.trim()) {
      setCategoryIcons(prevState => ({
        ...prevState,
        [customCategory]: customCategoryEmoji,
      }));
      setCategory(customCategory); // Select the new category
      setCustomCategory("");
      setCustomCategoryEmoji("");
      setIsCreateCategoryOpen(false);
    }
  };

    // Handle emoji selection for new category
const handleEmojiSelect = (emoji: string) => {
      setCustomCategoryEmoji(emoji);
      setIsEmojiPickerOpen(false); // Close the picker after selection
    };

  // Handle category dropdown selection (including new category option)
const handleCategorySelect = (value: string | undefined) => {
    if (value === 'create_new') {
      setIsCreateCategoryOpen(true);
    } else {
      setCategory(value);
    }
  };


  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={handleCategorySelect} value={category}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryIcons).map(([cat, icon]) => (
              <SelectItem key={cat} value={cat}>
                {icon} {cat}
              </SelectItem>
            ))}
            <SelectItem value="create_new">
              Create New
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="priority">Priority</Label>
        <Input
          type="number"
          id="priority"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !deadline && "text-muted-foreground"
              )}
            >
              <Icons.calendar className="mr-2 h-4 w-4" />
              {deadline ? (
                format(deadline, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={setDeadline}
              disabled={(date) =>
                date < new Date()
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
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
              <Button onClick={handleCreateCategory}>Create</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
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
