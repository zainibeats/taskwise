'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import '@/app/category-green.css';
import '@/app/clear-selection.css';

interface UserFormProps {
  user?: {
    id?: number;
    username?: string;
    email?: string;
    role?: string;
    active?: number;
  };
  onSubmit: (data: UserFormData) => Promise<boolean>;
}

interface UserFormData {
  username: string;
  email: string;
  role: string;
  active: boolean;
  password?: string;
}

export function UserForm({ user, onSubmit }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      role: user?.role || 'user',
      active: user?.active ? true : false,
      password: '',
    },
  });

  const role = watch('role');
  const active = watch('active');

  const onFormSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const success = await onSubmit(data);
      
      if (success) {
        setSuccess('User saved successfully');
        if (!user) {
          // Clear form if creating a new user
          reset({
            username: '',
            email: '',
            role: 'user',
            active: true,
            password: '',
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
          <p>{success}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="Enter username"
          {...register('username', { required: 'Username is required' })}
        />
        {errors.username && (
          <p className="text-sm text-red-500">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email"
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Invalid email address',
            }
          })}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          {user ? 'Password (leave blank to keep current)' : 'Password'}
        </Label>
        <Input
          id="password"
          type="password"
          placeholder={user ? 'Enter new password' : 'Enter password'}
          {...register('password', {
            required: user ? false : 'Password is required for new users',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            },
          })}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={role}
          onValueChange={(value) => setValue('role', value)}
        >
          <SelectTrigger className="category-green-select">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={active}
          onCheckedChange={(checked) => setValue('active', checked)}
        />
        <Label htmlFor="active">Active</Label>
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className="category-green-btn"
      >
        {isSubmitting ? 'Saving...' : user ? 'Update User' : 'Create User'}
      </Button>
    </form>
  );
} 