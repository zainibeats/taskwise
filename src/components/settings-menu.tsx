"use client"

import * as React from "react"
import { LogOut, User } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { conditionalToast } from "@/lib/toast-utils"
import { debugLog, debugError } from "@/lib/debug"
import { UserSettingsApi } from "@/lib/api-client"

/**
 * SettingsMenu component allows users to configure application settings,
 * specifically their Google AI API key for AI features.
 */
export function SettingsMenu() {
  const [apiKey, setApiKey] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Load API key from database when component mounts
  useEffect(() => {
    const loadApiKey = async () => {
      const savedApiKey = await UserSettingsApi.getSetting("googleAiApiKey");
      if (savedApiKey) {
        setApiKey(savedApiKey);
      }
    };
    
    // Check if the user is an admin
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.user?.role === 'admin')
        }
      } catch (error) {
        debugError('Error checking admin status:', error)
      }
    }
    
    loadApiKey();
    checkAdminStatus();
  }, [])

  // Save API key to database
  const saveApiKey = async () => {
    debugLog("Attempting to save API key, length:", apiKey.length);
    
    // Basic validation for Google AI API keys
    // This won't catch all invalid keys but helps prevent obvious errors
    if (apiKey && !apiKey.startsWith('AI')) {
      debugLog("Warning: API key doesn't start with 'AI', which is unusual for Google AI API keys");
      toast({
        title: "Warning: Unusual API Key Format",
        description: "Google AI API keys typically start with 'AI'. Your key may not work correctly.",
        variant: "destructive",
      });
    }
    
    if (apiKey && apiKey.length < 30) {
      debugLog("Warning: API key is suspiciously short:", apiKey.length);
      toast({
        title: "Warning: Key Too Short",
        description: "Your API key seems too short. Google AI keys are typically longer.",
        variant: "destructive",
      });
    }
    
    const success = await UserSettingsApi.saveSetting("googleAiApiKey", apiKey);
    
    if (success) {
      setIsDialogOpen(false);
      debugLog("API key saved successfully to database");
      conditionalToast({
        title: "API Key Saved",
        description: "Your Google AI API key has been saved successfully to the database.",
      }, "settings_api_key_saved");
      
      // Confirm the key was saved by retrieving it
      setTimeout(async () => {
        const savedKey = await UserSettingsApi.getSetting("googleAiApiKey");
        if (savedKey && savedKey === apiKey) {
          debugLog("API key verified in database");
        } else {
          debugError("API key verification failed - key in DB doesn't match or is missing");
          debugLog("Original key length:", apiKey.length, "Saved key length:", savedKey?.length || 0);
          toast({
            title: "Warning",
            description: "The API key may not have been saved correctly. Please try again.",
            variant: "destructive",
          });
        }
      }, 1000);
    } else {
      debugError("Failed to save API key to database");
      toast({
        title: "Error Saving API Key",
        description: "There was a problem saving your API key. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Clear API key from database
  const clearApiKey = async () => {
    const success = await UserSettingsApi.deleteSetting("googleAiApiKey");
    
    if (success) {
      setApiKey("");
      setIsDialogOpen(false);
      conditionalToast({
        title: "API Key Removed",
        description: "Your Google AI API key has been removed from the database.",
      }, "settings_api_key_removed");
    } else {
      toast({
        title: "Error Removing API Key",
        description: "There was a problem removing your API key. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  // Navigate to admin dashboard
  const goToAdminDashboard = () => {
    router.push('/admin')
  }

  // Logout user
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        conditionalToast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
        }, "logout");
        // Redirect to login page
        router.push('/login');
      } else {
        toast({
          title: "Logout Error",
          description: "There was a problem logging out. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="category-green-btn border-none">
            <User className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">User Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>User Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsDialogOpen(true)}>
            Google AI API Key
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onSelect={goToAdminDashboard}>
              Admin Dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google AI API Key</DialogTitle>
            <DialogDescription>
              Enter your personal Google AI API key to use for AI features like prioritization and subtask generation.
              This will be stored securely in the database.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">
                API Key
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google AI API key"
                className="col-span-3"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>You can get a Google AI API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>.</p>
              <p className="mt-2">If no API key is provided, the application will use the server's default key.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearApiKey}>
              Clear Key
            </Button>
            <Button onClick={saveApiKey}>Save Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}