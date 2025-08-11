import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VideoGenerationSettings } from "@/types/canvas";
import { SpinnerIcon } from "@/components/icons";
import {
  VideoModelSelector,
  VideoModelOptions,
  ModelPricingDisplay,
} from "./VideoModelComponents";
import {
  getVideoModelById,
  getDefaultVideoModel,
  type VideoModelConfig,
} from "@/lib/video-models";
import { ChevronRight, X } from "lucide-react";

interface ExtendVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExtend: (settings: VideoGenerationSettings) => void;
  videoUrl: string;
  isExtending: boolean;
}

export const ExtendVideoDialog: React.FC<ExtendVideoDialogProps> = ({
  isOpen,
  onClose,
  onExtend,
  videoUrl,
  isExtending,
}) => {
  const defaultModel = getDefaultVideoModel("video-extension");
  const [selectedModelId, setSelectedModelId] = useState(
    defaultModel?.id || "ltx-video-extend",
  );
  const [selectedModel, setSelectedModel] = useState<
    VideoModelConfig | undefined
  >(defaultModel);
  const [optionValues, setOptionValues] = useState<Record<string, any>>(
    defaultModel?.defaults || {},
  );
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Extract last frame when video URL changes
  useEffect(() => {
    if (videoUrl && isOpen) {
      const video = document.createElement("video");
      video.src = videoUrl;
      video.crossOrigin = "anonymous";

      video.addEventListener("loadedmetadata", () => {
        // Seek to near the end of the video
        video.currentTime = video.duration - 0.1;
      });

      video.addEventListener("seeked", () => {
        // Create canvas and extract frame
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setLastFrameUrl(canvas.toDataURL("image/png"));
        }
      });
    }
  }, [videoUrl, isOpen]);

  // Update model when selection changes
  useEffect(() => {
    const model = getVideoModelById(selectedModelId);
    if (model) {
      setSelectedModel(model);
      // Set defaults with a prompt suggesting continuation
      setOptionValues({
        ...model.defaults,
        prompt:
          "Continue the video naturally, maintaining the same style and motion...",
      });
    }
  }, [selectedModelId]);

  const handleOptionChange = (field: string, value: any) => {
    setOptionValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;

    // Map the dynamic options to the VideoGenerationSettings format
    const settings: VideoGenerationSettings = {
      prompt: optionValues.prompt || "Continue the video...",
      sourceUrl: videoUrl,
      modelId: selectedModel.id,
      // Include all option values
      ...optionValues,
      // Then override with properly typed values
      ...(optionValues.duration && {
        duration: parseInt(optionValues.duration),
      }),
      ...(optionValues.seed !== undefined && { seed: optionValues.seed }),
      // Indicate this is a video extension
      isVideoExtension: true,
    };

    onExtend(settings);
  };

  if (!selectedModel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-5 bg-background">
        <DialogHeader>
          <DialogTitle>Extend Video</DialogTitle>
          <DialogDescription>
            Continue your video by generating additional frames from the last
            frame.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          {/* Model Selection */}
          <div className="w-full mb-4">
            <VideoModelSelector
              value={selectedModelId}
              category="video-extension"
              onChange={setSelectedModelId}
              disabled={isExtending}
            />
          </div>

          {/* Pricing Display */}
          <ModelPricingDisplay model={selectedModel} className="mb-4" />

          <div className="flex gap-4">
            {/* Left column - Video Preview with note */}
            <div className="w-1/3">
              <div className="space-y-2">
                <div className="border border-border rounded-xl overflow-hidden aspect-square flex items-center justify-center bg-muted/30">
                  {lastFrameUrl ? (
                    <img
                      src={lastFrameUrl}
                      className="max-w-full max-h-full object-contain"
                      alt="Last frame"
                    />
                  ) : videoUrl ? (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="max-w-full max-h-full object-contain"
                      controls={false}
                      muted
                      playsInline
                    />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  The last frame will be used as the starting point
                </p>
              </div>
            </div>

            {/* Right column - Options */}
            <div className="w-2/3 space-y-4">
              {/* Main Options */}
              <VideoModelOptions
                model={selectedModel}
                values={optionValues}
                onChange={handleOptionChange}
                disabled={isExtending}
                optionKeys={[
                  "prompt",
                  "resolution",
                  "aspectRatio",
                  "frameRate",
                  "negativePrompt",
                ]}
              />

              {/* More Options Button */}
              {selectedModel &&
                Object.keys(selectedModel.options).length > 5 && (
                  <Button
                    type="button"
                    onClick={() => setShowMoreOptions(true)}
                    className="w-full flex items-center justify-center gap-2 text-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                    More Options
                  </Button>
                )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={onClose} disabled={isExtending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isExtending}>
              {isExtending ? (
                <>
                  <SpinnerIcon className="mr-2 h-4 w-4 animate-spin text-white" />
                  <span className="text-white">Extending...</span>
                </>
              ) : (
                <span className="text-white">Extend Video</span>
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Slide-out Panel for More Options */}
        {showMoreOptions && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setShowMoreOptions(false)}
            />

            {/* Panel */}
            <div className="fixed top-0 right-0 h-full w-96 bg-background shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                  <h3 className="font-semibold text-lg">Advanced Options</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowMoreOptions(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <VideoModelOptions
                    model={selectedModel}
                    values={optionValues}
                    onChange={handleOptionChange}
                    disabled={isExtending}
                    excludeKeys={[
                      "prompt",
                      "resolution",
                      "aspectRatio",
                      "frameRate",
                      "negativePrompt",
                    ]}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
