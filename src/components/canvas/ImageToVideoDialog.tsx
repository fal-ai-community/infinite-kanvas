import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { VideoGenerationSettings } from "@/types/canvas";
import { SpinnerIcon } from "@/components/icons";
import { RefreshCw, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImageToVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (settings: VideoGenerationSettings) => void;
  imageUrl: string;
  isConverting: boolean;
}

export const ImageToVideoDialog: React.FC<ImageToVideoDialogProps> = ({
  isOpen,
  onClose,
  onConvert,
  imageUrl,
  isConverting,
}) => {
  const [modelVersion, setModelVersion] = useState<"lite" | "pro">("lite"); // Default to lite version
  const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">(
    "720p",
  ); // Default to 720p
  const [duration, setDuration] = useState<"5" | "10">("5"); // Default 5 seconds
  const [cameraFixed, setCameraFixed] = useState(true); // Default camera fixed
  const [seed, setSeed] = useState<string>("random"); // Default random seed
  const [prompt, setPrompt] = useState(""); // Optional prompt for guidance

  // Update available resolutions when model version changes
  useEffect(() => {
    // Pro version only supports 480p and 1080p
    if (modelVersion === "pro" && resolution === "720p") {
      setResolution("1080p");
    }
  }, [modelVersion, resolution]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConvert({
      prompt,
      duration: parseInt(duration),
      sourceUrl: imageUrl,
      modelVersion,
      resolution,
      cameraFixed,
      seed: seed === "random" ? -1 : parseInt(seed),
    });
  };

  // Generate a random seed
  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 2147483647);
    setSeed(randomSeed.toString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-5 bg-white">
        <DialogHeader>
          <DialogTitle>Convert Image to Video</DialogTitle>
          <DialogDescription>
            Transform your static image into a dynamic video using AI.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          {/* Model Selection Dropdown */}
          <div className="w-full mb-4">
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={modelVersion === "lite" ? "lite" : "pro"}
              onChange={(e) =>
                setModelVersion(e.target.value as "lite" | "pro")
              }
              disabled={isConverting}
            >
              <option value="lite">Seedance 1.0 Lite -- Image to Video</option>
              <option value="pro">Seedance 1.0 Pro -- Image to Video</option>
            </select>
          </div>

          <div className="flex gap-4">
            {/* Left column - Image Preview */}
            <div className="w-1/3">
              <div className="border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-gray-50">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Source"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Right column - Controls */}
            <div className="w-2/3 space-y-4">
              {/* Prompt Input */}
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Input
                  id="prompt"
                  placeholder="Describe desired motion or elements to animate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isConverting}
                  className="mt-1"
                />
              </div>

              {/* Resolution */}
              <div>
                <div className="flex items-center">
                  <Label htmlFor="resolution" className="mr-2">
                    Resolution
                  </Label>
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Info className="h-4 w-4 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-xs bg-white p-2 shadow-lg rounded-md border"
                      >
                        <p>
                          Video resolution - 480p for faster generation, 720p
                          for higher quality. Default value: "720p"
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative mt-1">
                  <select
                    id="resolution"
                    className="w-full p-2 border border-gray-300 rounded-md bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={resolution}
                    onChange={(e) =>
                      setResolution(e.target.value as "480p" | "720p" | "1080p")
                    }
                    disabled={isConverting}
                  >
                    <option value="480p">480p</option>
                    {modelVersion === "lite" && (
                      <option value="720p">720p</option>
                    )}
                    <option value="1080p">1080p</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-400"
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

              {/* Duration */}
              <div>
                <div className="flex items-center">
                  <Label htmlFor="duration" className="mr-2">
                    Duration
                  </Label>
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Info className="h-4 w-4 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-xs bg-white p-2 shadow-lg rounded-md border"
                      >
                        <p>
                          Duration of the video in seconds. Default value: "5"
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative mt-1">
                  <select
                    id="duration"
                    className="w-full p-2 border border-gray-300 rounded-md bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as "5" | "10")}
                    disabled={isConverting}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-400"
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

              {/* Camera Fixed */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Label htmlFor="cameraFixed" className="mr-2">
                      Camera Fixed
                    </Label>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full flex items-center justify-center cursor-pointer"
                          >
                            <Info className="h-4 w-4 text-gray-400" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="max-w-xs bg-white p-2 shadow-lg rounded-md border"
                        >
                          <p>Whether to fix the camera position</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="cameraFixed"
                    checked={cameraFixed}
                    onCheckedChange={setCameraFixed}
                    disabled={isConverting}
                    aria-label="Camera Fixed"
                  />
                </div>
              </div>

              {/* Seed */}
              <div>
                <div className="flex items-center">
                  <Label htmlFor="seed" className="mr-2">
                    Seed
                  </Label>
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-full flex items-center justify-center cursor-pointer"
                        >
                          <Info className="h-4 w-4 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-xs bg-white p-2 shadow-lg rounded-md border"
                      >
                        <p>
                          Random seed to control video generation. Use -1 for
                          random.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex mt-1">
                  <Input
                    id="seed"
                    placeholder="random"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    disabled={isConverting}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="default"
                    className="ml-2 px-2"
                    onClick={generateRandomSeed}
                    disabled={isConverting}
                    title="Generate random seed"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-between">
            <Button
              type="button"
              variant="default"
              onClick={onClose}
              disabled={isConverting}
              className="border border-gray-300 bg-white hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isConverting}
              className="bg-primary text-white hover:bg-[#5b21b6] flex items-center gap-2"
            >
              {isConverting ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Run</span>
                  <span className="flex flex-row space-x-0.5">
                    <kbd className="flex items-center justify-center tracking-tighter rounded border px-1 font-mono bg-white/10 border-white/10 h-6 min-w-6 text-xs">
                      ⌘
                    </kbd>
                    <kbd className="flex items-center justify-center tracking-tighter rounded border px-1 font-mono bg-white/10 border-white/10 h-6 min-w-6 text-xs">
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
