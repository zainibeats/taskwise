import { useState, useCallback } from "react";

export interface UseCategoryActionsOptions {
  initialCategoryIcons: { [key: string]: string };
  builtInCategories: string[];
  tasks: any[];
  pushHistory: (tasks: any[]) => void;
}

export function useCategoryActions({
  initialCategoryIcons,
  builtInCategories,
  tasks,
  pushHistory,
}: UseCategoryActionsOptions) {
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryEmoji, setCustomCategoryEmoji] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [categoryIconsState, setCategoryIconsState] = useState<{ [key: string]: string }>(initialCategoryIcons);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  // Create new custom category
  const handleCreateCategory = useCallback(() => {
    if (customCategory.trim() && customCategoryEmoji.trim()) {
      setCategoryIconsState(prevState => ({
        ...prevState,
        [customCategory]: customCategoryEmoji,
      }));
      setSelectedCategory(customCategory); // Auto-select the new category
      setCustomCategory("");
      setCustomCategoryEmoji("");
      setIsCreateCategoryOpen(false);
    }
  }, [customCategory, customCategoryEmoji]);

  // Delete custom category and update tasks
  const handleDeleteCategory = useCallback((categoryToDelete: string) => {
    setCategoryIconsState(prevState => {
      const newState = { ...prevState };
      delete newState[categoryToDelete];
      return newState;
    });
    // Update all tasks with this category to 'Uncategorized'
    const updatedTasks = tasks.map(task =>
      task.category === categoryToDelete
        ? { ...task, category: "Uncategorized" }
        : task
    );
    pushHistory(updatedTasks);
    setSelectedCategory(undefined);
  }, [tasks, pushHistory]);

  // Emoji picker
  const handleEmojiSelect = useCallback((emoji: string) => {
    setCustomCategoryEmoji(emoji);
    setIsEmojiPickerOpen(false);
  }, []);

  // Category select
  const handleCategorySelect = useCallback((value: string | undefined) => {
    if (value === 'create_new') {
      setIsCreateCategoryOpen(true);
    } else {
      setSelectedCategory(value);
    }
  }, []);

  return {
    customCategory, setCustomCategory,
    customCategoryEmoji, setCustomCategoryEmoji,
    isEmojiPickerOpen, setIsEmojiPickerOpen,
    isCreateCategoryOpen, setIsCreateCategoryOpen,
    categoryIconsState, setCategoryIconsState,
    selectedCategory, setSelectedCategory,
    isManageCategoriesOpen, setIsManageCategoriesOpen,
    handleCreateCategory,
    handleDeleteCategory,
    handleEmojiSelect,
    handleCategorySelect,
  };
}
