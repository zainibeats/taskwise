import { useState, useEffect } from 'react';
import { Category } from '../types';

export default function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Create or update a category
  const saveCategory = async (category: Category) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
      });

      if (!response.ok) {
        throw new Error('Failed to save category');
      }

      const savedCategory = await response.json();
      
      // Update local state - add or replace existing category
      setCategories(prev => {
        const exists = prev.some(c => c.name === category.name);
        if (exists) {
          return prev.map(c => c.name === category.name ? savedCategory : c);
        } else {
          return [...prev, savedCategory];
        }
      });
      
      return savedCategory;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Delete a category
  const deleteCategory = async (name: string) => {
    try {
      const response = await fetch(`/api/categories?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      setCategories(prev => prev.filter(category => category.name !== name));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    saveCategory,
    deleteCategory,
  };
} 