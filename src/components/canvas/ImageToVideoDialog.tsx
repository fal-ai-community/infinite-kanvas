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
    defaultModel?.id || "ltx-video",
  );
  const [selectedModel, setSelectedModel] = useState<
    VideoModelConfig | undefined
  >(defaultModel);
  const [optionValues, setOptionValues] = useState<Record<string, any>>(
    defaultModel?.defaults || {},
  );

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
      <DialogContent className="sm:max-w-[600px] p-5 bg-white">
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

            {/* Right column - Dynamic Options */}
            <div className="w-2/3">
              <VideoModelOptions
                model={selectedModel}
                values={optionValues}
                onChange={handleOptionChange}
                disabled={isConverting}
              />
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
