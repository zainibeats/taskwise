'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// Client component that uses useSearchParams
function SetupForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
      setIsFirstTimeSetup(false);
    } else {
      // Check if this is first-time setup
      const checkFirstTimeSetup = async () => {
        try {
          const response = await fetch('/api/auth/setup-required');
          if (response.ok) {
            const data = await response.json();
            setIsFirstTimeSetup(data.setupRequired);
          }
        } catch (error) {
          console.error('Error checking setup status:', error);
        }
      };
      
      checkFirstTimeSetup();
    }
  }, [searchParams]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      let response;
      
      if (isFirstTimeSetup) {
        // First-time setup - create admin account
        response = await fetch('/api/auth/setup-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
          credentials: 'include', // Important: Include credentials for cookies
        });
      } else {
        // Regular password setup
        response = await fetch('/api/auth/set-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
          credentials: 'include', // Important: Include credentials for cookies
        });
      }
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: isFirstTimeSetup ? 'Admin account created' : 'Password set successfully',
          description: isFirstTimeSetup ? 'You can now log in with your new admin account' : 'You can now log in with your new password',
        });
        
        // Set the session cookie manually if needed
        if (data.sessionId) {
          // Give a moment for the cookie to be properly set before redirecting
          setTimeout(() => {
            router.push('/');
          }, 500);
        } else {
          router.push('/');
        }
      } else {
        setError(data.error || 'Failed to process your request');
        toast({
          title: 'Error',
          description: data.error || 'Failed to process your request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while processing your request');
      toast({
        title: 'Error',
        description: 'An error occurred while processing your request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {isFirstTimeSetup ? 'Create Admin Account' : 'Set Your Password'}
          </CardTitle>
          <CardDescription className="text-center">
            {isFirstTimeSetup 
              ? 'Create the first admin account for TaskWise' 
              : 'Create a password for your TaskWise account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!searchParams.get('username')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : (isFirstTimeSetup ? 'Create Admin Account' : 'Set Password')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          {!isFirstTimeSetup && (
            <Link href="/login" className="text-sm text-primary">
              Back to Login
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <p>Loading...</p>
      </div>
    }>
      <SetupForm />
    </Suspense>
  );
} 