import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (category: string, emoji: string) => void;
  emojiList?: string[]; // Optional custom emoji list
}

const DEFAULT_EMOJIS = [
  "🤖", "🍽️", "🪴", "🍼", "🎁", "🎭", "🐾", "🧸", "🌐", "🔐", "🖥️", "🛠️", "💊", "⭐", "📧", "🎉", "🐶", "🐱", "🛐", "📞", "⚽", "🗨️", "🚜", "🎵", "💳", "✏️", "🚗", "🎬"
];

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({ open, onOpenChange, onCreate, emojiList }) => {
  const [category, setCategory] = useState("");
  const [emoji, setEmoji] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const handleCreate = () => {
    if (category && emoji) {
      onCreate(category, emoji);
      setCategory("");
      setEmoji("");
      setIsEmojiPickerOpen(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setCategory("");
    setEmoji("");
    setIsEmojiPickerOpen(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
              value={category}
              onChange={e => setCategory(e.target.value)}
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
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={2}
                className="w-16"
              />
              <Button
                variant="outline"
                size="icon"
                className="category-green-btn"
                onClick={() => setIsEmojiPickerOpen(val => !val)}
                type="button"
              >
                <span role="img" aria-label="Pick Emoji">😀</span>
              </Button>
              {isEmojiPickerOpen && (
                <div className="absolute z-10 bg-popover text-popover-foreground shadow-md rounded-md p-2 w-64">
                  <ScrollArea className="h-[200px] w-full rounded-md border">
                    <div className="grid grid-cols-5 gap-2">
                      {(emojiList || DEFAULT_EMOJIS).map(e => (
                        <button
                          key={e}
                          className="text-2xl hover:bg-[rgba(139,233,253,0.1)] hover:text-[#8be9fd] rounded-md transition-colors"
                          onClick={() => { setEmoji(e); setIsEmojiPickerOpen(false); }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button variant="ghost" className="w-full mt-2 category-green-btn" onClick={() => setIsEmojiPickerOpen(false)}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} className="category-clear-btn">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreate} disabled={!category || !emoji}>Create</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
