"use client";

import React, { useState, useRef } from "react";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Canvas } from "@/types/db";
import { Logo } from "@/components/icons";
import { Clock, Plus, Search, X, Trash2, Globe, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IndexedDBMigration } from "@/components/migration/IndexedDBMigration";

export default function HomePage() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [canvasName, setCanvasName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();
  const client = useTRPCClient();

  // Use React Query with tRPC client for list query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["canvas.list", { limit: 50 }],
    queryFn: async () => {
      return await client.canvas.list.query({ limit: 50 });
    },
  });

  const createMutation = useMutation({
    ...trpc.canvas.create.mutationOptions(),
    onSuccess: () => {
      refetch();
    },
  });

  const deleteMutation = useMutation({
    ...trpc.canvas.delete.mutationOptions(),
    onSuccess: () => {
      refetch();
    },
  });

  // Filter canvases based on search query
  const filteredCanvases =
    data?.canvases?.filter((canvas: Canvas) => {
      if (!searchQuery.trim()) return true;
      return canvas.title.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];

  const handleCreateCanvas = async () => {
    const canvas = await createMutation.mutateAsync({
      title: canvasName.trim() || "Untitled Canvas",
      isPublic,
      state: {
        images: [],
        videos: [],
        viewport: { x: 0, y: 0, scale: 1 },
        version: "1.0.0",
      },
    });

    // Close dialog and navigate to new canvas
    setIsDialogOpen(false);
    router.push(`/k/${canvas.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, canvasId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      confirm(
        "Are you sure you want to delete this canvas? This action cannot be undone.",
      )
    ) {
      setDeletingId(canvasId);
      await deleteMutation.mutateAsync({ id: canvasId });
      setDeletingId(null);
    }
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
                placeholder="Search canvases..."
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
              backgroundSize: "40px 40px",
              backgroundPosition: "0 0, 20px 20px",
              opacity: 0.1,
            }}
          />

          {isLoading ? (
            <div className="h-full flex items-center justify-center relative z-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredCanvases.length === 0 ? (
            <div className="h-full flex items-center justify-center relative z-10">
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "No canvases found" : "No canvases yet"}
              </p>
            </div>
          ) : (
            <div className="w-full px-8 pt-8 pb-4 relative z-10">
              <div className="inline-grid grid-cols-[repeat(auto-fill,minmax(150px,150px))] gap-4 justify-center w-full">
                {filteredCanvases.map((canvas: Canvas) => (
                  <Link key={canvas.id} href={`/k/${canvas.id}`}>
                    <div className="group relative w-[150px] h-[150px] flex flex-col p-3 rounded border border-border hover:border-primary hover:bg-muted/20 transition-colors cursor-pointer overflow-hidden">
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(e, canvas.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-background/80 backdrop-blur rounded hover:bg-destructive hover:text-destructive-foreground"
                        disabled={deletingId === canvas.id}
                      >
                        {deletingId === canvas.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>

                      {/* Public/Private indicator */}
                      <div
                        className="absolute top-2 left-2"
                        title={
                          canvas.is_public ? "Public canvas" : "Private canvas"
                        }
                      >
                        {canvas.is_public ? (
                          <Globe className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                        <h3 className="text-sm font-medium text-center px-2 line-clamp-2">
                          {canvas.title}
                        </h3>
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>
                            {formatDistanceToNow(new Date(canvas.updated_at))}{" "}
                            ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Migration section */}
      <div className="fixed bottom-20 left-0 right-0 z-20 py-4">
        <div className="max-w-sm mx-auto px-4">
          <IndexedDBMigration />
        </div>
      </div>

      {/* Fixed Create button at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 py-4 pb-4">
        <div className="max-w-sm mx-auto px-4">
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="lg"
            className="w-full transition-all duration-200 hover:bg-muted/50 active:bg-muted/70"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Canvas
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

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Create Canvas Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setCanvasName("");
            setIsPublic(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Canvas</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Canvas name input */}
            <div className="space-y-2">
              <Label htmlFor="canvasname">Canvas name</Label>
              <Input
                id="canvasname"
                value={canvasName}
                onChange={(e) => setCanvasName(e.target.value)}
                placeholder="Enter canvas name"
                className="w-full"
              />
            </div>

            {/* Public/Private toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="public">Make canvas public</Label>
                <p className="text-xs text-muted-foreground">
                  Public canvases can be discovered by others
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {/* Create button */}
            <Button
              variant="default"
              className="w-full"
              onClick={handleCreateCanvas}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </span>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
