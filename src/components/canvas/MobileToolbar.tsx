import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Copy,
  Crop,
  Scissors,
  Combine,
  Download,
  Trash2,
  Layers,
  ChevronUp,
  ChevronDown,
  MoveUp,
  MoveDown,
} from "lucide-react";
import { SpinnerIcon } from "@/components/icons";
import type { PlacedImage, GenerationSettings } from "@/types/canvas";

interface MobileToolbarProps {
  selectedIds: string[];
  images: PlacedImage[];
  isGenerating: boolean;
  generationSettings: GenerationSettings;
  handleRun: () => void;
  handleDuplicate: () => void;
  handleRemoveBackground: () => void;
  handleCombineImages: () => void;
  handleDelete: () => void;
  setCroppingImageId: (id: string | null) => void;
  sendToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  selectedIds,
  images,
  isGenerating,
  generationSettings,
  handleRun,
  handleDuplicate,
  handleRemoveBackground,
  handleCombineImages,
  handleDelete,
  setCroppingImageId,
  sendToFront,
  sendToBack,
  bringForward,
  sendBackward,
}) => {
  return (
    <div
      className={cn(
        "flex items-center flex-col gap-1 md:hidden bg-background/80 rounded-2xl p-1 bg-card",
        "transition-transform duration-300 ease-in-out",
        selectedIds.length > 0
          ? "translate-x-0"
          : "-translate-x-[calc(100%+1rem)]",
        "shadow-[0_0_0_1px_rgba(50,50,50,0.12),0_4px_8px_-0.5px_rgba(50,50,50,0.04),0_8px_16px_-2px_rgba(50,50,50,0.02)]",
        "dark:shadow-none dark:border dark:border-border",
      )}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRun}
        disabled={isGenerating || !generationSettings.prompt.trim()}
        className="w-12 h-12 p-0"
        title="Run"
      >
        {isGenerating ? (
          <SpinnerIcon className="h-12 w-12 animate-spin" />
        ) : (
          <Play className="h-12 w-12" />
        )}
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleDuplicate}
        disabled={selectedIds.length === 0}
        className="w-12 h-12 p-0"
        title="Duplicate"
      >
        <Copy className="h-12 w-12" />
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          if (selectedIds.length === 1) {
            setCroppingImageId(selectedIds[0]);
          }
        }}
        disabled={selectedIds.length !== 1}
        className="w-12 h-12 p-0"
        title="Crop"
      >
        <Crop className="h-12 w-12" />
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleRemoveBackground}
        disabled={selectedIds.length === 0}
        className="w-12 h-12 p-0"
        title="Remove Background"
      >
        <Scissors className="h-12 w-12" />
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleCombineImages}
        disabled={selectedIds.length < 2}
        className="w-12 h-12 p-0"
        title="Combine Images"
      >
        <Combine className="h-12 w-12" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            disabled={selectedIds.length === 0}
            className="w-12 h-12 p-0"
            title="Layer Order"
          >
            <Layers className="h-12 w-12" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          sideOffset={10}
          alignOffset={-4}
          align="start"
          className="w-48 space-y-1 bg-background/80 border rounded p-1"
        >
          <DropdownMenuItem asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={sendToFront}
              disabled={selectedIds.length === 0}
              className="w-full h-12 justify-start gap-3 px-3"
            >
              <MoveUp className="h-6 w-6" />
              <span className="font-medium">Send to Front</span>
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={bringForward}
              disabled={selectedIds.length === 0}
              className="w-full h-12 justify-start gap-3 px-3"
            >
              <ChevronUp className="h-6 w-6" />
              <span className="font-medium">Bring Forward</span>
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={sendBackward}
              disabled={selectedIds.length === 0}
              className="w-full h-12 justify-start gap-3 px-3"
            >
              <ChevronDown className="h-6 w-6" />
              <span className="font-medium">Send Backward</span>
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={sendToBack}
              disabled={selectedIds.length === 0}
              className="w-full h-12 justify-start gap-3 px-3"
            >
              <MoveDown className="h-6 w-6" />
              <span className="font-medium">Send to Back</span>
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="secondary"
        size="sm"
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
        className="w-12 h-12 p-0"
        title="Download"
      >
        <Download className="h-12 w-12" />
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
        className="w-12 h-12 p-0 text-destructive hover:text-destructive"
        title="Delete"
      >
        <Trash2 className="h-12 w-12" />
      </Button>
    </div>
  );
};
