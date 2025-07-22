import React from "react";
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
      className={`w-full p-2 border border-gray-300 rounded-md bg-white text-base focus:outline-none focus:ring-1 focus:ring-blue-500 safari-select ${className}`}
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
    <div className={`text-sm text-gray-600 ${className}`}>
      <p
        dangerouslySetInnerHTML={{
          __html: pricingMessage
            .replace(
              /\$[\d.]+/,
              (match) => `<strong class="text-gray-900">${match}</strong>`,
            )
            .replace(
              /(\d+) times/,
              (match, num) =>
                `<strong class="text-gray-900">${num} times</strong>`,
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
                        <Info className="h-4 w-4 text-gray-400" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-xs bg-white p-2 shadow-lg rounded-md border"
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
                        <Info className="h-4 w-4 text-gray-400" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-xs bg-white p-2 shadow-lg rounded-md border"
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
                className="w-full p-2 border border-gray-300 rounded-md bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 safari-select"
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
                          <Info className="h-4 w-4 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-xs bg-white p-2 shadow-lg rounded-md border"
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
                        <Info className="h-4 w-4 text-gray-400" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-xs bg-white p-2 shadow-lg rounded-md border"
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
