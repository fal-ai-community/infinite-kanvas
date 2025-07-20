"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, ChevronDown } from "lucide-react";
import { useMultiplayer } from "@/hooks/use-multiplayer";
import { useToast } from "@/hooks/use-toast";

export const UserMenu: React.FC = () => {
  const { presenceMap, syncAdapter } = useMultiplayer();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const myUserId = syncAdapter?.getConnectionId();
  const myUser = myUserId ? presenceMap.get(myUserId) : null;

  // Load saved name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("userName") || "Guest";
    setUserName(savedName);
    setInputValue(savedName);
  }, []);

  const handleSaveName = () => {
    if (!inputValue.trim()) return;
    
    const newName = inputValue.trim();
    localStorage.setItem("userName", newName);
    setUserName(newName);
    setIsEditing(false);
    
    // In a real implementation, we'd send this to the server
    // For now, just show a toast
    toast({
      description: "Name updated. Refresh to apply changes.",
      duration: 3000,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(userName);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-20">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
          >
            <div
              className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: myUser?.color || "#666" }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="max-w-[150px] truncate">{userName}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>User Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="p-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your name"
                    className="h-8"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    className="h-8 px-2"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50"
                  onClick={() => setIsEditing(true)}
                >
                  <span className="text-sm">{userName}</span>
                  <span className="text-xs text-muted-foreground">Click to edit</span>
                </div>
              )}
            </div>
            
            {myUser && (
              <div className="mt-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div
                    className="h-3 w-3 rounded"
                    style={{ backgroundColor: myUser.color }}
                  />
                  <span>Your color in this room</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Connected users: {presenceMap.size}
                </div>
              </div>
            )}
          </div>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-xs text-muted-foreground"
            disabled
          >
            Changes apply on next connection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};