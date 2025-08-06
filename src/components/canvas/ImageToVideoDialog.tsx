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
  const defaultModel = getDefaultVideoModel("image-to-video");
  const [selectedModelId, setSelectedModelId] = useState(
    defaultModel?.id || "seedance-pro",
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
    // This maintains backward compatibility with existing code
    const settings: VideoGenerationSettings = {
      prompt: optionValues.prompt || "",
      sourceUrl: imageUrl,
      modelId: selectedModel.id,
      // Include all option values for new models first
      ...optionValues,
      // Then override with properly typed values
      ...(optionValues.duration && {
        duration: parseInt(optionValues.duration),
      }),
      ...(optionValues.seed !== undefined && { seed: optionValues.seed }),
    };

    onConvert(settings);
  };

  if (!selectedModel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-5">
        <DialogHeader>
          <DialogTitle>Convert Image to Video</DialogTitle>
          <DialogDescription>
            Transform your static image into a dynamic video using AI.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          {/* Model Selection */}
          <div className="w-full mb-4">
            <VideoModelSelector
              value={selectedModelId}
              onChange={setSelectedModelId}
              category="image-to-video"
              disabled={isConverting}
            />
          </div>

          {/* Pricing Display */}
          <ModelPricingDisplay model={selectedModel} className="mb-4" />

          <div className="flex gap-4">
            {/* Left column - Image Preview */}
            <div className="w-1/3">
              <div className="border rounded-md overflow-hidden aspect-square flex items-center justify-center">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Source image"
                    className="w-full h-full object-contain"
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
                    variant="ghost"
                    onClick={() => setShowMoreOptions(true)}
                    className="px-0 pr-4 flex gap-2 text-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                    More Options
                  </Button>
                )}
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isConverting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isConverting}
              className="flex items-center gap-2"
            >
              {isConverting ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin text-white" />
                  <span className="text-white">Converting...</span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-white">Run</span>
                  <span className="flex flex-row space-x-0.5">
                    <kbd className="flex items-center justify-center text-white tracking-tighter rounded-xl border px-1 font-mono bg-white/10 border-white/10 h-6 min-w-6 text-xs">
                      ↵
                    </kbd>
                  </span>
                </div>
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
            <div className="fixed top-0 right-0 h-full w-96 bg-card shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-3 border-b">
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
