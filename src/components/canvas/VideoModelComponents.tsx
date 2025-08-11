import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getVideoModelsByCategory,
  formatPricingMessage,
  type VideoModelConfig,
  type VideoModelOption,
} from "@/lib/video-models";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SpinnerIcon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";

// RadioGroup components
export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-border text-primary shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

// VideoModelSelector Component
interface VideoModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  category: VideoModelConfig["category"];
  disabled?: boolean;
  className?: string;
}

export const VideoModelSelector: React.FC<VideoModelSelectorProps> = ({
  value,
  onChange,
  category,
  disabled = false,
  className = "",
}) => {
  const models = getVideoModelsByCategory(category);

  return (
    <select
      className={`w-full p-2 border border-border bg-background text-foreground rounded-xl text-base focus:outline-none focus:ring-1 focus:ring-ring safari-select ${className}`}
      style={{
        lineHeight: "1.5",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name} — ${model.pricing.costPerVideo.toFixed(2)}/video
          {model.isDefault ? "" : ""}
        </option>
      ))}
    </select>
  );
};

// ModelPricingDisplay Component
interface ModelPricingDisplayProps {
  model: VideoModelConfig;
  className?: string;
}

export const ModelPricingDisplay: React.FC<ModelPricingDisplayProps> = ({
  model,
  className = "",
}) => {
  const pricingMessage = formatPricingMessage(model);

  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      <p
        dangerouslySetInnerHTML={{
          __html: pricingMessage
            .replace(
              /\$[\d.]+/,
              (match) => `<strong class="text-foreground">${match}</strong>`,
            )
            .replace(
              /(\d+) times/,
              (match, num) =>
                `<strong class="text-foreground">${num} times</strong>`,
            ),
        }}
      />
    </div>
  );
};

// VideoModelOptions Component
interface VideoModelOptionsProps {
  model: VideoModelConfig;
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  disabled?: boolean;
  optionKeys?: string[]; // Only show these specific options
  excludeKeys?: string[]; // Exclude these options
}

export const VideoModelOptions: React.FC<VideoModelOptionsProps> = ({
  model,
  values,
  onChange,
  disabled = false,
  optionKeys,
  excludeKeys,
}) => {
  const renderOption = (key: string, option: VideoModelOption) => {
    const value = values[key] ?? option.default;

    switch (option.type) {
      case "text":
        return (
          <div key={key}>
            <div className="flex items-center">
              <Label htmlFor={key} className="mr-2">
                {option.label}
              </Label>
              {option.description && (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-xs bg-popover text-popover-foreground p-2 shadow-lg rounded-xl border border-border"
                    >
                      <p>{option.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Input
              id={key}
              placeholder={option.placeholder}
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
              disabled={disabled}
              className="mt-1"
              required={option.required}
            />
          </div>
        );

      case "select":
        return (
          <div key={key}>
            <div className="flex items-center">
              <Label htmlFor={key} className="mr-2">
                {option.label}
              </Label>
              {option.description && (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-xs bg-popover text-popover-foreground p-2 shadow-lg rounded-xl border border-border"
                    >
                      <p>{option.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="relative mt-1">
              <select
                id={key}
                className="w-full p-2 border border-border bg-background text-foreground rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring safari-select"
                style={{
                  lineHeight: "1.5",
                  paddingTop: "0.5rem",
                  paddingBottom: "0.5rem",
                }}
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                disabled={disabled}
              >
                {option.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        );

      case "boolean":
        return (
          <div key={key}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label htmlFor={key} className="mr-2">
                  {option.label}
                </Label>
                {option.description && (
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-xs bg-popover text-popover-foreground p-2 shadow-lg rounded-xl border border-border"
                      >
                        <p>{option.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Switch
                id={key}
                checked={value}
                onCheckedChange={(checked) => onChange(key, checked)}
                disabled={disabled}
                aria-label={option.label}
              />
            </div>
          </div>
        );

      case "number":
        const isSeedException =
          key === "seed" &&
          (value === "random" || value === -1 || value === "");
        return (
          <div key={key}>
            <div className="flex items-center">
              <Label htmlFor={key} className="mr-2">
                {option.label}
              </Label>
              {option.description && (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-xs bg-popover text-popover-foreground p-2 shadow-lg rounded-xl border border-border"
                    >
                      <p>{option.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex mt-1">
              <Input
                id={key}
                type={key === "seed" ? "text" : "number"}
                placeholder={option.placeholder}
                value={isSeedException ? "random" : value}
                onChange={(e) => {
                  if (key === "seed") {
                    const val = e.target.value;
                    if (val === "random" || val === "") {
                      onChange(key, -1);
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) {
                        onChange(key, num);
                      }
                    }
                  } else {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num)) {
                      // Special handling for startFrameNum - must be multiple of 8
                      if (key === "startFrameNum" && num % 8 !== 0) {
                        // Round to nearest multiple of 8
                        const rounded = Math.round(num / 8) * 8;
                        onChange(key, rounded);
                      } else {
                        onChange(key, num);
                      }
                    }
                  }
                }}
                disabled={disabled}
                min={option.min}
                max={option.max}
                step={option.step}
                className="flex-1"
                required={option.required}
              />
              {key === "startFrameNum" && value % 8 !== 0 && (
                <span className="ml-2 text-xs text-orange-600">
                  Will be rounded to {Math.round(value / 8) * 8}
                </span>
              )}
              {key === "seed" && (
                <Button
                  type="button"
                  variant="default"
                  className="ml-2 px-2"
                  onClick={() => {
                    const randomSeed = Math.floor(Math.random() * 2147483647);
                    onChange(key, randomSeed);
                  }}
                  disabled={disabled}
                  title="Generate random seed"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Filter options based on optionKeys or excludeKeys
  const optionsToRender = Object.entries(model.options).filter(([key]) => {
    if (optionKeys && optionKeys.length > 0) {
      return optionKeys.includes(key);
    }
    if (excludeKeys && excludeKeys.length > 0) {
      return !excludeKeys.includes(key);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {optionsToRender.map(([key, option]) => renderOption(key, option))}
    </div>
  );
};

// RemoveVideoBackgroundDialog Component
interface RemoveVideoBackgroundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (backgroundColor: string) => void;
  videoUrl: string;
  videoDuration: number; // Duration in seconds
  isProcessing: boolean;
}

export const RemoveVideoBackgroundDialog: React.FC<
  RemoveVideoBackgroundDialogProps
> = ({ isOpen, onClose, onProcess, videoUrl, videoDuration, isProcessing }) => {
  const [backgroundColor, setBackgroundColor] = useState<string>("transparent");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins} minute${mins !== 1 ? "s" : ""} ${secs} second${secs !== 1 ? "s" : ""}`;
  };

  // Reset preview when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null);
      setIsLoadingPreview(false);
    }
  }, [isOpen]);

  // Extract first frame when video URL changes
  useEffect(() => {
    if (videoUrl && isOpen) {
      setIsLoadingPreview(true);
      const video = document.createElement("video");
      video.src = videoUrl;
      video.crossOrigin = "anonymous";

      // Add preload to speed up loading
      video.preload = "metadata";

      const handleLoadedData = () => {
        // Seek to the first frame
        video.currentTime = 0.1;
      };

      const handleSeeked = () => {
        // Create canvas and extract frame
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setPreviewUrl(canvas.toDataURL("image/png"));
          setIsLoadingPreview(false);
        }
      };

      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("seeked", handleSeeked);

      // Start loading
      video.load();

      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("seeked", handleSeeked);
      };
    }
  }, [videoUrl, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProcess(backgroundColor);
  };

  const handleRadioChange = (value: string) => {
    setBackgroundColor(value);
  };

  // Define color mappings
  const colorMap: Record<string, string> = {
    transparent: "bg-muted/50 border-2 border-dashed border-border",
    black: "bg-black",
    white: "bg-background border border-border",
    gray: "bg-muted-foreground",
    red: "bg-red-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-400",
    cyan: "bg-cyan-400",
    magenta: "bg-pink-500",
    orange: "bg-orange-500",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Remove Video Background</DialogTitle>
            <DialogDescription>
              Configure background removal settings for your video
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Preview */}
            <div className="flex justify-center">
              <div className="w-[360px] h-[180px] border border-border rounded-xl overflow-hidden bg-muted/30 relative">
                {isLoadingPreview ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <SpinnerIcon className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Video preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">
                      No preview available
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Duration and cost estimation */}
            <Alert className="py-2 [&>svg]:w-[16px] [&>svg]:h-[16px]">
              <AlertDescription className="text-sm">
                <span className="font-medium">
                  ${(videoDuration * 0.14).toFixed(2)}
                </span>{" "}
                for {Math.floor(videoDuration)}s video • Processing may take
                several minutes
              </AlertDescription>
            </Alert>

            {/* Background color options */}
            <div className="space-y-3">
              <Label>Background Color</Label>
              <RadioGroup
                value={backgroundColor}
                onValueChange={handleRadioChange}
              >
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(colorMap).map(([color, className]) => (
                    <div key={color} className="flex items-center space-x-3">
                      <RadioGroupItem value={color} id={color} />
                      <Label
                        htmlFor={color}
                        className="flex items-center space-x-2 font-normal cursor-pointer flex-1"
                      >
                        <div className={`w-5 h-5 rounded ${className}`} />
                        <span className="capitalize">{color}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between">
            <Button
              type="button"
              variant="default"
              onClick={onClose}
              disabled={isProcessing}
              className="border border-border bg-background hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isProcessing}
              className="bg-primary text-white hover:bg-[#5b21b6] flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Run</span>
                  <span className="flex flex-row space-x-0.5">
                    <kbd className="flex items-center justify-center tracking-tighter rounded-xl border px-1 font-mono bg-white/10 border-white/10 h-6 min-w-6 text-xs">
                      ⌘
                    </kbd>
                    <kbd className="flex items-center justify-center tracking-tighter rounded-xl border px-1 font-mono bg-white/10 border-white/10 h-6 min-w-6 text-xs">
                      ↵
                    </kbd>
                  </span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
