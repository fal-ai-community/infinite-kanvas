import React from "react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShortcutBadge } from "./ShortcutBadge";
import {
  Play,
  Copy,
  Crop,
  Scissors,
  Filter,
  Combine,
  Download,
  X,
  Layers,
  ChevronUp,
  ChevronDown,
  MoveUp,
  MoveDown,
} from "lucide-react";
import { SpinnerIcon } from "@/components/icons";
import { checkOS } from "@/utils/os-utils";
import type { PlacedImage, GenerationSettings } from "@/types/canvas";

interface CanvasContextMenuProps {
  selectedIds: string[];
  images: PlacedImage[];
  isGenerating: boolean;
  generationSettings: GenerationSettings;
  isolateInputValue: string;
  isIsolating: boolean;
  handleRun: () => void;
  handleDuplicate: () => void;
  handleRemoveBackground: () => void;
  handleCombineImages: () => void;
  handleDelete: () => void;
  handleIsolate: () => void;
  setCroppingImageId: (id: string | null) => void;
  setIsolateInputValue: (value: string) => void;
  setIsolateTarget: (id: string | null) => void;
  sendToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  selectedIds,
  images,
  isGenerating,
  generationSettings,
  isolateInputValue,
  isIsolating,
  handleRun,
  handleDuplicate,
  handleRemoveBackground,
  handleCombineImages,
  handleDelete,
  handleIsolate,
  setCroppingImageId,
  setIsolateInputValue,
  setIsolateTarget,
  sendToFront,
  sendToBack,
  bringForward,
  sendBackward,
}) => {
  return (
    <ContextMenuContent>
      <ContextMenuItem
        onClick={handleRun}
        disabled={isGenerating || !generationSettings.prompt.trim()}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <SpinnerIcon className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span>Run</span>
        </div>
        <ShortcutBadge
          variant="alpha"
          size="xs"
          shortcut={
            checkOS("Win") || checkOS("Linux") ? "ctrl+enter" : "meta+enter"
          }
        />
      </ContextMenuItem>
      <ContextMenuItem
        onClick={handleDuplicate}
        disabled={selectedIds.length === 0}
        className="flex items-center gap-2"
      >
        <Copy className="h-4 w-4" />
        Duplicate
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          if (selectedIds.length === 1) {
            setCroppingImageId(selectedIds[0]);
          }
        }}
        disabled={selectedIds.length !== 1}
        className="flex items-center gap-2"
      >
        <Crop className="h-4 w-4" />
        Crop
      </ContextMenuItem>
      <ContextMenuItem
        onClick={handleRemoveBackground}
        disabled={selectedIds.length === 0}
        className="flex items-center gap-2"
      >
        <Scissors className="h-4 w-4" />
        Remove Background
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger
          disabled={selectedIds.length !== 1}
          className="flex items-center gap-2"
          onMouseEnter={() => {
            // Reset input value and set target when hovering over the submenu trigger
            setIsolateInputValue("");
            if (selectedIds.length === 1) {
              setIsolateTarget(selectedIds[0]);
            }
          }}
        >
          <Filter className="h-4 w-4" />
          Isolate Object
        </ContextMenuSubTrigger>
        <ContextMenuSubContent
          className="w-72 p-3"
          sideOffset={5}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div
            className="flex flex-col gap-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Label
              htmlFor="isolate-context-input"
              className="text-sm font-medium"
            >
              What to isolate:
            </Label>
            <div className="flex gap-2">
              <Input
                id="isolate-context-input"
                type="text"
                placeholder="e.g. car, face, person"
                value={isolateInputValue}
                onChange={(e) => setIsolateInputValue(e.target.value)}
                style={{ fontSize: "16px" }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    isolateInputValue.trim() &&
                    !isIsolating
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleIsolate();
                  }
                }}
                onFocus={(e) => {
                  // Select all text on focus for easier replacement
                  e.target.select();
                }}
                className="flex-1"
                autoFocus
                disabled={isIsolating}
              />
              <Button
                type="button"
                variant="primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isolateInputValue.trim() && !isIsolating) {
                    handleIsolate();
                  }
                }}
                disabled={!isolateInputValue.trim() || isIsolating}
              >
                {isIsolating ? (
                  <>
                    <SpinnerIcon className="h-4 w-4 animate-spin mr-1" />
                    Processing...
                  </>
                ) : (
                  "Enter"
                )}
              </Button>
            </div>
          </div>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem
        onClick={handleCombineImages}
        disabled={selectedIds.length < 2}
        className="flex items-center gap-2"
      >
        <Combine className="h-4 w-4" />
        Combine Images
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger
          disabled={selectedIds.length === 0}
          className="flex items-center gap-2"
        >
          <Layers className="h-4 w-4" />
          Layer Order
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-64" sideOffset={5}>
          <ContextMenuItem
            onClick={sendToFront}
            disabled={selectedIds.length === 0}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <MoveUp className="h-4 w-4" />
              <span>Send to Front</span>
            </div>
            <ShortcutBadge
              variant="alpha"
              size="xs"
              shortcut={
                checkOS("Win") || checkOS("Linux") ? "ctrl+]" : "meta+]"
              }
            />
          </ContextMenuItem>
          <ContextMenuItem
            onClick={bringForward}
            disabled={selectedIds.length === 0}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <ChevronUp className="h-4 w-4" />
              <span>Bring Forward</span>
            </div>
            <ShortcutBadge variant="alpha" size="xs" shortcut="]" />
          </ContextMenuItem>
          <ContextMenuItem
            onClick={sendBackward}
            disabled={selectedIds.length === 0}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4" />
              <span>Send Backward</span>
            </div>
            <ShortcutBadge variant="alpha" size="xs" shortcut="[" />
          </ContextMenuItem>
          <ContextMenuItem
            onClick={sendToBack}
            disabled={selectedIds.length === 0}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <MoveDown className="h-4 w-4" />
              <span>Send to Back</span>
            </div>
            <ShortcutBadge
              variant="alpha"
              size="xs"
              shortcut={
                checkOS("Win") || checkOS("Linux") ? "ctrl+[" : "meta+["
              }
            />
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem
        onClick={() => {
          selectedIds.forEach((id) => {
            const image = images.find((img) => img.id === id);
            if (image) {
              const link = document.createElement("a");
              link.download = `image-${Date.now()}.png`;
              link.href = image.src;
              link.click();
            }
          });
        }}
        disabled={selectedIds.length === 0}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Download
      </ContextMenuItem>
      <ContextMenuItem
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
        className="flex items-center gap-2 text-destructive"
      >
        <X className="h-4 w-4" />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );
};
