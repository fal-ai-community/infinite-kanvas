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

interface VideoToVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (settings: VideoGenerationSettings) => void;
  videoUrl: string;
  isConverting: boolean;
}

export const VideoToVideoDialog: React.FC<VideoToVideoDialogProps> = ({
  isOpen,
  onClose,
  onConvert,
  videoUrl,
  isConverting,
}) => {
  const defaultModel = getDefaultVideoModel("video-to-video");
  const [selectedModelId, setSelectedModelId] = useState(
    defaultModel?.id || "ltx-video-multiconditioning",
  );
  const [selectedModel, setSelectedModel] = useState<
    VideoModelConfig | undefined
  >(defaultModel);
  const [optionValues, setOptionValues] = useState<Record<string, any>>(
    defaultModel?.defaults || {},
  );
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Update model when selection changes
  useEffect(() => {
    const model = getVideoModelById(selectedModelId);
    if (model) {
      setSelectedModel(model);
      setOptionValues(model.defaults);
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
      prompt: optionValues.prompt || "",
      sourceUrl: videoUrl,
      modelId: selectedModel.id,
      // Include all option values
      ...optionValues,
      // Then override with properly typed values
      ...(optionValues.duration && {
        duration: parseInt(optionValues.duration),
      }),
      ...(optionValues.seed !== undefined && { seed: optionValues.seed }),
      // Indicate this is a video-to-video transformation
      isVideoToVideo: true,
    };

    onConvert(settings);
  };

  if (!selectedModel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-5 bg-white">
        <DialogHeader>
          <DialogTitle>Video to Video</DialogTitle>
          <DialogDescription>
            Transform your video with AI-powered style transfer and effects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          {/* Model Selection */}
          <div className="w-full mb-4">
            <VideoModelSelector
              value={selectedModelId}
              category="video-to-video"
              onChange={setSelectedModelId}
              disabled={isConverting}
            />
          </div>

          {/* Pricing Display */}
          <ModelPricingDisplay model={selectedModel} className="mb-4" />

          <div className="flex gap-4">
            {/* Left column - Video Preview */}
            <div className="w-1/3">
              <div className="border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-gray-50">
                {videoUrl && (
                  <video
                    src={videoUrl}
                    className="max-w-full max-h-full object-contain"
                    controls={false}
                    muted
                    playsInline
                  />
                )}
              </div>
            </div>

            {/* Right column - Options */}
            <div className="w-2/3 space-y-4">
              {/* Main Options */}
              <VideoModelOptions
                model={selectedModel}
                values={optionValues}
                onChange={handleOptionChange}
                disabled={isConverting}
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
                    variant="outline"
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
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isConverting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isConverting}>
              {isConverting ? (
                <>
                  <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                "Transform Video"
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
            <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-lg">Advanced Options</h3>
                  <Button
                    type="button"
                    variant="ghost"
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
                    disabled={isConverting}
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
