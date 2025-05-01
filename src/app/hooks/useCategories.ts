import { useState, useEffect } from 'react';
import { Category } from '../types';

// Use relative path for better HTTPS compatibility
const API_BASE_URL = '/api';

export default function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all categories
  const fetchCategories = async () => {
    const apiUrl = `${API_BASE_URL}/categories`;
    console.log('[useCategories] Fetching categories from:', apiUrl);
    setLoading(true);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      console.log('[useCategories] Received categories:', data);
      setCategories(data);
      setError(null);
    } catch (err) {
      console.error('[useCategories] Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Create or update a category
  const saveCategory = async (category: Category) => {
    const apiUrl = `${API_BASE_URL}/categories`;
    console.log('[useCategories] Saving category at:', apiUrl, category);
    try {
      const response = await fetch(apiUrl, {
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
      console.log('[useCategories] Category saved:', savedCategory);
      
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
      console.error('[useCategories] Error saving category:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  // Delete a category
  const deleteCategory = async (name: string) => {
    const apiUrl = `${API_BASE_URL}/categories?name=${encodeURIComponent(name)}`;
    console.log('[useCategories] Deleting category at:', apiUrl);
    try {
      const response = await fetch(apiUrl, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      console.log('[useCategories] Category deleted successfully');
      setCategories(prev => prev.filter(category => category.name !== name));
      return true;
    } catch (err) {
      console.error('[useCategories] Error deleting category:', err);
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