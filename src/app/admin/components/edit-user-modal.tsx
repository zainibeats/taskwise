'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { UserForm } from './user-form';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  active: number;
}

interface EditUserModalProps {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function EditUserModal({ userId, open, onOpenChange, onUserUpdated }: EditUserModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchUser(userId);
    } else {
      setUser(null);
    }
  }, [open, userId]);

  async function fetchUser(id: number) {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/users/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user');
      }
      
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser(userData: {
    username: string;
    email: string;
    role: string;
    active: boolean;
    password?: string;
  }) {
    if (!userId) return false;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          active: userData.active ? 1 : 0, // Convert boolean to number
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }
      
      // Notify parent component
      onUserUpdated();
      
      // Close the modal
      onOpenChange(false);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error updating user:', err);
      return false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the user information below.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="py-6 text-center">Loading user information...</div>
        ) : user ? (
          <div className="py-4">
            <UserForm 
              user={user} 
              onSubmit={handleUpdateUser} 
            />
          </div>
        ) : (
          <div className="py-6 text-center">User not found</div>
        )}
        
        <DialogFooter className="sm:justify-start">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}