import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Users, Link2, Check, Copy } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export const MultiplayerControls: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  return (
    <>
      <div className="absolute bottom-4 left-4 z-20">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-10 h-10 p-0 transition-all duration-200"
          title="Start multiplayer session"
        >
          <Users className="h-4 w-4" />
        </Button>
        {isHovered && (
          <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-background/80 border rounded text-xs whitespace-nowrap">
            Start Multiplayer
          </div>
        )}
      </div>

      {/* Multiplayer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Multiplayer Session</DialogTitle>
            <DialogDescription>
              Create a collaborative canvas session that others can join in
              real-time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Your current canvas will be shared with anyone who has the link.
                Changes will sync in real-time.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    const roomId = uuidv4();
                    window.location.href = `/k/${roomId}`;
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Create Room
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const roomId = uuidv4();
                    const link = `${window.location.origin}/k/${roomId}`;
                    navigator.clipboard.writeText(link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                    // Open in new tab after copying
                    setTimeout(() => {
                      window.open(`/k/${roomId}`, "_blank");
                    }, 500);
                  }}
                >
                  {copiedLink ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Copy & Open
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">How it works:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Share the room link with collaborators</li>
                <li>See live cursors and changes</li>
                <li>Images sync automatically</li>
                <li>Works on desktop and mobile</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
