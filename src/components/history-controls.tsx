"use client";

import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const HistoryControls: React.FC<HistoryControlsProps> = ({ 
  canUndo,
  canRedo,
  onUndo,
  onRedo 
}) => {
  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        className={cn(
          "transition-opacity duration-300 ease-in-out category-green-btn",
          canUndo ? "opacity-100" : "opacity-0 pointer-events-none" 
        )}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        className={cn(
          "transition-opacity duration-300 ease-in-out category-green-btn",
          canRedo ? "opacity-100" : "opacity-0 pointer-events-none" 
        )}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}; 