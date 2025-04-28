'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get('returnUrl') || '/';

  // Check if first-time setup is required when the component mounts
  useEffect(() => {
    const checkSetupRequired = async () => {
      try {
        const response = await fetch('/api/auth/setup-required');
        if (response.ok) {
          const data = await response.json();
          if (data.setupRequired) {
            router.push('/setup');
          }
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
      } finally {
        setCheckingSetup(false);
      }
    };
    
    checkSetupRequired();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
        router.push(returnUrl);
      } else {
        toast({
          title: 'Login failed',
          description: data.error || 'Invalid username or password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login failed',
        description: 'An error occurred during login',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const checkIfPasswordNeeded = async (username: string) => {
    if (!username) return;
    
    try {
      // Check if the user needs to setup a password
      const response = await fetch(`/api/auth/password-needed?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        console.error('Error response from password-needed endpoint:', await response.text());
        return;
      }
      
      const data = await response.json();
      
      if (data.needsSetup) {
        router.push(`/setup?username=${encodeURIComponent(username)}`);
      }
    } catch (error) {
      console.error('Error checking password setup:', error);
    }
  };

  if (checkingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <p>Checking setup status...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Login to TaskWise</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                onBlur={() => checkIfPasswordNeeded(username)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center flex-col space-y-2">
          <p className="text-sm text-gray-500">
            First time login? Use your username and you'll be directed to set your password.
          </p>
          <Link href="/" className="text-sm text-primary">
            Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 