import { useState, useCallback, useEffect } from "react";

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
  console.log('[HOOK] useCategoryActions initialized');
  console.log('[HOOK] initialCategoryIcons received:', initialCategoryIcons);
  console.log('[HOOK] builtInCategories received:', builtInCategories);
  
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryEmoji, setCustomCategoryEmoji] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [categoryIconsState, setCategoryIconsState] = useState<{ [key: string]: string }>(initialCategoryIcons);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  
  // Log when categoryIconsState is initialized
  console.log('[HOOK] categoryIconsState initialized with:', categoryIconsState);
  
  // This effect ensures that whenever initialCategoryIcons changes (like when custom categories are loaded),
  // the categoryIconsState is updated to match it
  useEffect(() => {
    console.log('[HOOK] initialCategoryIcons changed, updating categoryIconsState');
    console.log('[HOOK] New initialCategoryIcons:', initialCategoryIcons);
    setCategoryIconsState(initialCategoryIcons);
  }, [initialCategoryIcons]);

  // Create new custom category
  const handleCreateCategory = useCallback(() => {
    if (customCategory.trim() && customCategoryEmoji.trim()) {
      console.log(`[HOOK] Creating new custom category: ${customCategory} with emoji: ${customCategoryEmoji}`);
      setCategoryIconsState(prevState => {
        const newState = {
          ...prevState,
          [customCategory]: customCategoryEmoji,
        };
        console.log('[HOOK] Updated categoryIconsState in handleCreateCategory:', newState);
        return newState;
      });
      setSelectedCategory(customCategory); // Auto-select the new category
      setCustomCategory("");
      setCustomCategoryEmoji("");
      setIsCreateCategoryOpen(false);
    }
  }, [customCategory, customCategoryEmoji]);

  // Delete custom category and update tasks
  const handleDeleteCategory = useCallback((categoryToDelete: string) => {
    console.log(`[HOOK] Deleting custom category: ${categoryToDelete}`);
    setCategoryIconsState(prevState => {
      console.log('[HOOK] Previous state before deletion:', prevState);
      const newState = { ...prevState };
      delete newState[categoryToDelete];
      console.log('[HOOK] New state after deletion:', newState);
      return newState;
    });
    // Update all tasks with this category to 'Uncategorized'
    const updatedTasks = tasks.map(task =>
      task.category === categoryToDelete
        ? { ...task, category: "Uncategorized" }
        : task
    );
    console.log('[HOOK] Updating tasks after category deletion');
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
