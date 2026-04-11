"use client";

import Image from 'next/image';
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/theme-toggle";
import { ClearAllDataButton } from "@/components/ClearAllDataButton";
import { SettingsMenu } from "@/components/settings-menu";

export function AppHeader() {
  return (
    <>
      <div className="absolute top-6 right-6 z-10 flex items-center space-x-2">
        <SettingsMenu />
        <ModeToggle />
        <ClearAllDataButton />
      </div>
      <CardHeader className="flex flex-col items-center text-center">
        <Image
          src="/images/logo.png"
          alt="TaskWise Logo"
          width={128}
          height={128}
        />
        <CardTitle className="mt-2">TaskWise</CardTitle>
        <CardDescription>
          Organize your life with AI-powered task management.
        </CardDescription>
      </CardHeader>
    </>
  );
}
