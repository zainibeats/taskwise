"use client"

import * as React from "react"
import { User } from "lucide-react"
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

  // Load API key from localStorage when component mounts
  useEffect(() => {
    const savedApiKey = localStorage.getItem("googleAiApiKey")
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
    
    // Check if the user is an admin
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.user?.role === 'admin')
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }
    
    checkAdminStatus()
  }, [])

  // Save API key to localStorage
  const saveApiKey = () => {
    localStorage.setItem("googleAiApiKey", apiKey)
    setIsDialogOpen(false)
    toast({
      title: "API Key Saved",
      description: "Your Google AI API key has been saved successfully.",
    })
  }

  // Clear API key from localStorage
  const clearApiKey = () => {
    localStorage.removeItem("googleAiApiKey")
    setApiKey("")
    setIsDialogOpen(false)
    toast({
      title: "API Key Removed",
      description: "Your Google AI API key has been removed.",
    })
  }
  
  // Navigate to admin dashboard
  const goToAdminDashboard = () => {
    router.push('/admin')
  }

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
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google AI API Key</DialogTitle>
            <DialogDescription>
              Enter your personal Google AI API key to use for AI features like prioritization and subtask generation.
              This will be stored locally in your browser.
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