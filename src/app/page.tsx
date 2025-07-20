"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import {
  Users,
  Clock,
  Plus,
  Link2,
  Check,
  Copy,
  Lock,
  Globe,
  Search,
  X,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Fuse from "fuse.js";
import { useRoomRegistry } from "@/hooks/use-room-registry";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [userName, setUserName] = useState("Guest");
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Use real-time room registry
  const { rooms, createRoom } = useRoomRegistry();

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(rooms, {
      keys: ["name", "id", "creatorName"],
      threshold: 0.3,
    });
  }, [rooms]);

  // Filter rooms based on search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    return fuse.search(searchQuery).map(result => result.item);
  }, [searchQuery, fuse, rooms]);

  // Load saved user name
  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateRoom = () => {
    setIsDialogOpen(true);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Fixed background */}
      <div className="fixed inset-0 bg-background" />
      
      {/* Fixed Header with Logo and Search */}
      <header className="fixed top-0 left-0 right-0 z-20">
        <div className="h-16 flex items-center justify-center">
          <Logo className="h-7 w-auto" />
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="max-w-sm mx-auto relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-12 pl-10 pr-10 bg-background border border-border rounded-md focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-200 ${
                  searchQuery ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="h-full relative z-0">
        {/* Top gradient fade */}
        <div
          className="fixed inset-x-0 top-0 h-32 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.7) 50%, transparent 100%)",
          }}
        />

        {/* Bottom gradient fade */}
        <div
          className="fixed inset-x-0 bottom-0 h-32 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.7) 50%, transparent 100%)",
          }}
        />

        {/* Scrollable content with grid */}
        <div className="h-full overflow-y-auto scrollbar-hide pt-24 pb-20 relative">
          {/* Dotted grid background */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 20px 20px',
              opacity: 0.1
            }}
          />
          
          {filteredRooms.length === 0 ? (
            <div className="h-full flex items-center justify-center relative z-10">
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "No rooms found" : "No active rooms"}
              </p>
            </div>
          ) : (
            <div className="w-full px-8 pt-8 pb-4 relative z-10">
              <div className="inline-grid grid-cols-[repeat(auto-fill,minmax(150px,150px))] gap-4 justify-center w-full">
                {filteredRooms.map((room) => (
                  <Link key={room.id} href={`/k/${room.id}`}>
                    <div className="group relative w-[150px] h-[150px] flex flex-col p-3 rounded border border-border hover:border-primary hover:bg-muted/20 transition-colors cursor-pointer overflow-hidden">
                      {/* Main content */}
                      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                        <h3 className="text-sm font-medium text-center px-2 line-clamp-2">
                          {room.name || `Room ${room.id.slice(0, 6)}`}
                        </h3>
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground relative">
                          <Users className={`h-3 w-3 flex-shrink-0 transition-opacity duration-300 ${
                            room.userCount && room.userCount > 0 ? "opacity-100" : "opacity-50"
                          }`} />
                          <div className="relative w-3 h-4">
                            <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                              room.userCount && room.userCount > 0 ? "opacity-100" : "opacity-50"
                            }`}>
                              {room.userCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="text-center text-xs text-muted-foreground mt-auto pt-2">
                        {formatTimeAgo(room.lastVisited)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Create button at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 py-4 pb-4">
        <div className="max-w-sm mx-auto px-4">
          <Button
            onClick={handleCreateRoom}
            size="lg"
            className="w-full transition-all duration-200 hover:bg-muted/50 active:bg-muted/70"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {/* Hide scrollbar and fade-in animation */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-in-out forwards;
        }
        
        @keyframes fade-out-in {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        .animate-number-change {
          animation: fade-out-in 0.3s ease-in-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Multiplayer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setRoomName("");
          setCopiedLink(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New room</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Room name input */}
            <div className="space-y-2">
              <Label htmlFor="roomname">Room name</Label>
              <Input
                id="roomname"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="w-full"
              />
            </div>

            {/* User name input */}
            <div className="space-y-2">
              <Label htmlFor="username">Your name</Label>
              <Input
                id="username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full"
              />
            </div>

            {/* Public/Private toggle */}
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">Room visibility</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded border transition-all duration-200 ${
                    isPublic
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium">Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded border transition-all duration-200 ${
                    !isPublic
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">Private</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? "Anyone can discover and join this room"
                  : "Only people with the link can join"}
              </p>
            </div>

            {/* Create button */}
            <Button
              variant="default"
              className="w-full"
              onClick={async () => {
                const roomId = uuidv4();
                localStorage.setItem("userName", userName);
                const params = new URLSearchParams({
                  public: isPublic.toString(),
                  ...(roomName && { name: roomName })
                });
                
                // Notify registry about new room
                await createRoom(roomId, roomName || `Room ${roomId.slice(0, 6)}`, isPublic, userName);
                
                // Navigate to the room
                window.location.href = `/k/${roomId}?${params}`;
              }}
            >
              Start
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
