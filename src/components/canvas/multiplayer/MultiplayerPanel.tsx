"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  Check,
  Link2,
  Eye,
  EyeOff,
  MessageCircle,
  Edit2,
} from "lucide-react";
import { useMultiplayer } from "@/hooks/use-multiplayer";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/icons";
import type { ChatMessage } from "@/types/multiplayer";

interface MultiplayerPanelProps {
  onToggleCursors?: (show: boolean) => void;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  onFollowUser?: (userId: string | null) => void;
  followingUserId?: string | null;
  showCursors?: boolean;
}

export const MultiplayerPanel: React.FC<MultiplayerPanelProps> = ({
  onToggleCursors,
  isExpanded: controlledExpanded,
  onExpandChange,
  onFollowUser,
  followingUserId,
  showCursors = true,
}) => {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : localExpanded;
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "chat">("users");
  const [chatInput, setChatInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    roomId,
    syncAdapter,
    presenceMap,
    images,
    chatMessages: hookChatMessages,
    sendChatMessage,
  } = useMultiplayer();

  const usersList = Array.from(presenceMap.values());
  const userCount = usersList.length;

  const myUserId = syncAdapter?.getConnectionId();
  const myUser = myUserId ? presenceMap.get(myUserId) : null;

  useEffect(() => {
    console.log("[MultiplayerPanel] Users:", usersList.length);
    console.log("[MultiplayerPanel] My userId:", myUserId);
    console.log("[MultiplayerPanel] My user:", myUser?.name);
    console.log(
      "[MultiplayerPanel] All users:",
      usersList.map((u) => ({ id: u.userId, name: u.name })),
    );
  }, [usersList.length, myUserId, myUser]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [hookChatMessages]);

  const handleToggleExpand = () => {
    setIsAnimating(true);
    const newExpanded = !isExpanded;
    if (onExpandChange) {
      onExpandChange(newExpanded);
    } else {
      setLocalExpanded(newExpanded);
    }
    setTimeout(() => setIsAnimating(false), 350);
  };

  const sanitizeInput = (input: string): string => {
    // Remove any HTML tags and limit length
    return input
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/[<>]/g, "") // Remove angle brackets
      .trim()
      .slice(0, 500); // Limit to 500 characters
  };

  const handleSendMessage = () => {
    const sanitizedInput = sanitizeInput(chatInput);
    if (!sanitizedInput) return;

    sendChatMessage(sanitizedInput);
    setChatInput("");
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/k/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // fal-aligned color palette
  const colorPalette = [
    "#FF6B6B", // Coral red
    "#4ECDC4", // Teal
    "#45B7D1", // Sky blue
    "#96CEB4", // Sage green
    "#FECA57", // Golden yellow
    "#FF9FF3", // Pink
    "#54A0FF", // Blue
    "#48DBFB", // Light blue
  ];

  return (
    <TooltipProvider>
      <div className="fixed top-4 left-4 z-20 w-80">
        <div className="bg-background/95 backdrop-blur-sm border rounded shadow-lg overflow-hidden">
          {/* Fixed Header */}
          <div
            className={cn(
              "flex items-center justify-between px-3 h-12",
              "bg-muted/50 border-b",
              !isExpanded &&
                "cursor-pointer hover:bg-muted/60 transition-colors",
            )}
            onClick={() => !isExpanded && handleToggleExpand()}
          >
            <Logo className="h-5 w-auto opacity-60" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              className="h-8 w-8 p-0 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>

          {/* Expandable Content */}
          <div
            className={cn(
              "overflow-hidden transition-[max-height] duration-300 ease-in-out relative",
              isAnimating && "will-change-[max-height]",
            )}
            style={{
              maxHeight: isExpanded ? "420px" : "0px",
            }}
          >
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("users")}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium transition-colors relative",
                  activeTab === "users"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Users className="h-4 w-4 inline mr-1" />
                Users
                {activeTab === "users" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium transition-colors relative",
                  activeTab === "chat"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Chat
                {activeTab === "chat" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            {/* Content Area */}
            <div className="h-[280px] relative flex flex-col">
              {activeTab === "users" ? (
                <div className="flex flex-col h-full">
                  <div className="flex-1 relative overflow-hidden">
                    {/* Gradient fade overlay for users tab */}
                    {usersList.length > 3 && (
                      <div
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{
                          background:
                            "linear-gradient(to bottom, transparent 0%, transparent 85%, hsl(var(--background)) 95%, hsl(var(--background)) 100%)",
                        }}
                      />
                    )}
                    <ScrollArea className="h-full">
                      {usersList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground min-h-[200px]">
                          <Users className="h-8 w-8 mb-2 opacity-30" />
                          <p>No users connected</p>
                        </div>
                      ) : (
                        <div className="p-3 space-y-2">
                          {/* Current user first */}
                          {myUser && (
                            <>
                              <div
                                className={cn(
                                  "group flex items-center gap-2 p-2 rounded transition-all duration-200 border border-transparent",
                                  isExpanded && "opacity-0 animate-fade-in",
                                )}
                                style={
                                  isExpanded
                                    ? {
                                        animationDelay: "0ms",
                                        animationFillMode: "forwards",
                                      }
                                    : {}
                                }
                              >
                                <div
                                  className="h-8 w-8 rounded"
                                  style={{ backgroundColor: myUser.color }}
                                />
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                  {editingName ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        value={newName}
                                        onChange={(e) =>
                                          setNewName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            const sanitizedName = sanitizeInput(
                                              newName,
                                            ).slice(0, 50);
                                            if (sanitizedName) {
                                              localStorage.setItem(
                                                "userName",
                                                sanitizedName,
                                              );
                                              setEditingName(false);
                                              // Reload to apply new name
                                              window.location.reload();
                                            }
                                          } else if (e.key === "Escape") {
                                            setEditingName(false);
                                            setNewName(myUser.name || "");
                                          }
                                        }}
                                        className="h-6 text-sm"
                                        autoFocus
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-sm font-medium truncate">
                                          {myUser.name}
                                        </span>
                                        <button
                                          onClick={() => {
                                            setEditingName(true);
                                            setNewName(myUser.name || "");
                                          }}
                                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </button>
                                      </div>
                                      {myUser.cursor && (
                                        <span className="text-xs text-muted-foreground">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    (You)
                                  </span>
                                </div>
                              </div>
                              <div className="border-b" />
                            </>
                          )}

                          {/* Other users */}
                          {usersList
                            .filter((user) => user.userId !== myUserId)
                            .map((user, index) => (
                              <div
                                key={user.userId}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-all duration-200 cursor-pointer border border-transparent",
                                  isExpanded && "opacity-0 animate-fade-in",
                                  followingUserId === user.userId &&
                                    "bg-primary/10 border-primary/20",
                                )}
                                style={
                                  isExpanded
                                    ? {
                                        animationDelay: `${(index + 1) * 50}ms`,
                                        animationFillMode: "forwards",
                                      }
                                    : {}
                                }
                                onClick={() => {
                                  if (onFollowUser) {
                                    // Toggle follow - if already following this user, stop following
                                    onFollowUser(
                                      followingUserId === user.userId
                                        ? null
                                        : user.userId,
                                    );
                                  }
                                }}
                              >
                                <div
                                  className="h-8 w-8 rounded"
                                  style={{ backgroundColor: user.color }}
                                />
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm font-medium truncate">
                                        {user.name}
                                      </span>
                                    </div>
                                    {user.cursor && (
                                      <span className="text-xs text-muted-foreground">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  {followingUserId === user.userId && (
                                    <span className="text-xs text-primary font-medium">
                                      Following
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 relative overflow-hidden">
                    {/* Gradient fade overlay for chat messages only */}
                    {hookChatMessages.length > 5 && (
                      <div
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{
                          background:
                            "linear-gradient(to bottom, transparent 0%, transparent 85%, hsl(var(--background)) 95%, hsl(var(--background)) 100%)",
                        }}
                      />
                    )}
                    <ScrollArea className="h-full" ref={scrollRef}>
                      {hookChatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground min-h-[200px]">
                          <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
                          <p>No messages yet. Say hello!</p>
                        </div>
                      ) : (
                        <div className="p-3 space-y-2">
                          {hookChatMessages.map((msg, index) => (
                            <div
                              key={msg.id}
                              className={cn(
                                "space-y-1",
                                isExpanded && "opacity-0 animate-fade-in-up",
                              )}
                              style={
                                isExpanded
                                  ? {
                                      animationDelay: `${Math.min(index * 50, 200)}ms`,
                                      animationFillMode: "forwards",
                                    }
                                  : {}
                              }
                            >
                              <div className="flex items-baseline gap-2">
                                <span
                                  className="text-sm font-medium"
                                  style={{ color: msg.color }}
                                >
                                  {msg.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(msg.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm pl-0 break-words">
                                {msg.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  <div className="p-3 border-t bg-background">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 h-8 text-sm"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-8 w-8 p-0 bg-slate-100 hover:bg-slate-200 text-slate-700"
                        variant="secondary"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        const newValue = !showCursors;
                        onToggleCursors?.(newValue);
                      }}
                      className="h-8 w-8 p-0 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {showCursors ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {showCursors ? "Hide cursors" : "Show cursors"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCopyLink}
                      className="h-8 w-8 p-0 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {copiedLink ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {copiedLink ? "Copied!" : "Copy room link"}
                  </TooltipContent>
                </Tooltip>
              </div>

              <span className="text-xs text-muted-foreground">
                {images.length} shared{" "}
                {images.length === 1 ? "image" : "images"}
              </span>
            </div>
          </div>
        </div>

        {/* CSS animations */}
        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          :global(.animate-fade-in) {
            animation: fade-in 0.3s ease-out;
          }

          :global(.animate-fade-in-up) {
            animation: fade-in-up 0.3s ease-out;
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
};
