export interface VideoModelOption {
  name: string;
  type: "select" | "boolean" | "number" | "text";
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface ModelConstraints {
  resolutionsByModel?: Record<string, string[]>;
  conditionalOptions?: Array<{
    when: { field: string; value: any };
    then: { field: string; value: any };
  }>;
}

export interface VideoModelPricing {
  costPerVideo: number;
  currency: string;
  unit: string;
}

export interface VideoModelConfig {
  id: string;
  name: string;
  endpoint: string;
  category:
    | "text-to-video"
    | "image-to-video"
    | "video-to-video"
    | "multiconditioning";
  pricing: VideoModelPricing;
  options: Record<string, VideoModelOption>;
  defaults: Record<string, any>;
  constraints?: ModelConstraints;
  isDefault?: boolean;
  supportsMultipleCategories?: boolean;
}

export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  "ltx-video-multiconditioning": {
    id: "ltx-video-multiconditioning",
    name: "LTX Video Multiconditioning",
    endpoint: "fal-ai/ltx-video-13b-dev/multiconditioning",
    category: "multiconditioning",
    supportsMultipleCategories: true,
    pricing: {
      costPerVideo: 0.2,
      currency: "USD",
      unit: "video",
    },
    isDefault: true,
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "Text prompt to guide generation",
        placeholder: "Describe the motion or transformation...",
        required: true,
      },
      negativePrompt: {
        name: "negativePrompt",
        type: "text",
        label: "Negative Prompt",
        description: "What to avoid in the generation",
        default:
          "worst quality, inconsistent motion, blurry, jittery, distorted",
        placeholder: "worst quality, inconsistent motion...",
      },
      resolution: {
        name: "resolution",
        type: "select",
        label: "Resolution",
        description: "Video resolution",
        default: "720p",
        options: [
          { value: "480p", label: "480p" },
          { value: "720p", label: "720p" },
        ],
      },
      aspectRatio: {
        name: "aspectRatio",
        type: "select",
        label: "Aspect Ratio",
        description: "The aspect ratio of the video",
        default: "auto",
        options: [
          { value: "auto", label: "Auto (from source)" },
          { value: "9:16", label: "9:16 (Portrait)" },
          { value: "1:1", label: "1:1 (Square)" },
          { value: "16:9", label: "16:9 (Landscape)" },
        ],
      },
      numFrames: {
        name: "numFrames",
        type: "number",
        label: "Number of Frames",
        description: "The number of frames in the video (9-161)",
        default: 121,
        min: 9,
        max: 161,
        step: 8,
      },
      frameRate: {
        name: "frameRate",
        type: "number",
        label: "Frame Rate",
        description: "The frame rate of the video",
        default: 30,
        min: 1,
        max: 60,
        step: 1,
      },
      firstPassNumInferenceSteps: {
        name: "firstPassNumInferenceSteps",
        type: "number",
        label: "First Pass Inference Steps",
        description: "Number of inference steps during the first pass",
        default: 30,
        min: 2,
        max: 50,
        step: 1,
      },
      firstPassSkipFinalSteps: {
        name: "firstPassSkipFinalSteps",
        type: "number",
        label: "First Pass Skip Final Steps",
        description:
          "Steps to skip at the end of first pass for larger changes",
        default: 3,
        min: 0,
        max: 50,
        step: 1,
      },
      secondPassNumInferenceSteps: {
        name: "secondPassNumInferenceSteps",
        type: "number",
        label: "Second Pass Inference Steps",
        description: "Number of inference steps during the second pass",
        default: 30,
        min: 2,
        max: 50,
        step: 1,
      },
      secondPassSkipInitialSteps: {
        name: "secondPassSkipInitialSteps",
        type: "number",
        label: "Second Pass Skip Initial Steps",
        description:
          "Steps to skip at the beginning of second pass for finer details",
        default: 17,
        min: 1,
        max: 50,
        step: 1,
      },
      seed: {
        name: "seed",
        type: "number",
        label: "Seed",
        description: "Random seed for generation. Leave empty for random",
        min: 0,
        max: 2147483647,
        placeholder: "random",
      },
      expandPrompt: {
        name: "expandPrompt",
        type: "boolean",
        label: "Expand Prompt",
        description: "Whether to expand the prompt using a language model",
        default: false,
      },
      reverseVideo: {
        name: "reverseVideo",
        type: "boolean",
        label: "Reverse Video",
        description: "Whether to reverse the video",
        default: false,
      },
      enableSafetyChecker: {
        name: "enableSafetyChecker",
        type: "boolean",
        label: "Enable Safety Checker",
        description: "Whether to enable the safety checker",
        default: true,
      },
      constantRateFactor: {
        name: "constantRateFactor",
        type: "number",
        label: "Compression Quality",
        description:
          "CRF for input compression (20=high quality, 60=low quality)",
        default: 35,
        min: 20,
        max: 60,
        step: 5,
      },
    },
    defaults: {
      prompt: "",
      negativePrompt:
        "worst quality, inconsistent motion, blurry, jittery, distorted",
      resolution: "720p",
      aspectRatio: "auto",
      numFrames: 121,
      frameRate: 30,
      firstPassNumInferenceSteps: 30,
      firstPassSkipFinalSteps: 3,
      secondPassNumInferenceSteps: 30,
      secondPassSkipInitialSteps: 17,
      expandPrompt: false,
      reverseVideo: false,
      enableSafetyChecker: true,
      constantRateFactor: 35,
    },
  },
  "seedance-lite": {
    id: "seedance-lite",
    name: "SeeDANCE 1.0 Lite",
    endpoint: "fal-ai/bytedance/seedance/v1/lite/image-to-video",
    category: "image-to-video",
    pricing: {
      costPerVideo: 0.18,
      currency: "USD",
      unit: "video",
    },
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "Describe desired motion or elements to animate",
        placeholder: "Describe desired motion or elements to animate...",
        default: "",
      },
      resolution: {
        name: "resolution",
        type: "select",
        label: "Resolution",
        description:
          "Video resolution - 480p for faster generation, 720p for higher quality",
        default: "720p",
        options: [
          { value: "480p", label: "480p" },
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
        ],
      },
      duration: {
        name: "duration",
        type: "select",
        label: "Duration",
        description: "Duration of the video in seconds",
        default: "5",
        options: [
          { value: "5", label: "5 seconds" },
          { value: "10", label: "10 seconds" },
        ],
      },
      cameraFixed: {
        name: "cameraFixed",
        type: "boolean",
        label: "Camera Fixed",
        description: "Whether to fix the camera position",
        default: true,
      },
      seed: {
        name: "seed",
        type: "number",
        label: "Seed",
        description:
          "Random seed to control video generation. Use -1 for random",
        default: -1,
        min: -1,
        max: 2147483647,
        placeholder: "random",
      },
    },
    defaults: {
      prompt: "",
      resolution: "720p",
      duration: "5",
      cameraFixed: true,
      seed: -1,
    },
  },
  "seedance-pro": {
    id: "seedance-pro",
    name: "SeeDANCE 1.0 Pro",
    endpoint: "fal-ai/bytedance/seedance/v1/pro/image-to-video",
    category: "image-to-video",
    pricing: {
      costPerVideo: 0.62,
      currency: "USD",
      unit: "video",
    },
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "Describe desired motion or elements to animate",
        placeholder: "Describe desired motion or elements to animate...",
        default: "",
      },
      resolution: {
        name: "resolution",
        type: "select",
        label: "Resolution",
        description: "Video resolution - Pro version supports 480p and 1080p",
        default: "1080p",
        options: [
          { value: "480p", label: "480p" },
          { value: "1080p", label: "1080p" },
        ],
      },
      duration: {
        name: "duration",
        type: "select",
        label: "Duration",
        description: "Duration of the video in seconds",
        default: "5",
        options: [
          { value: "5", label: "5 seconds" },
          { value: "10", label: "10 seconds" },
        ],
      },
      cameraFixed: {
        name: "cameraFixed",
        type: "boolean",
        label: "Camera Fixed",
        description: "Whether to fix the camera position",
        default: true,
      },
      seed: {
        name: "seed",
        type: "number",
        label: "Seed",
        description:
          "Random seed to control video generation. Use -1 for random",
        default: -1,
        min: -1,
        max: 2147483647,
        placeholder: "random",
      },
    },
    defaults: {
      prompt: "",
      resolution: "1080p",
      duration: "5",
      cameraFixed: true,
      seed: -1,
    },
    constraints: {
      resolutionsByModel: {
        pro: ["480p", "1080p"],
      },
    },
  },
  "ltx-video": {
    id: "ltx-video",
    name: "LTX Video-0.9.7 13B",
    endpoint: "fal-ai/ltx-video-13b-dev/image-to-video",
    category: "image-to-video",
    pricing: {
      costPerVideo: 0.2,
      currency: "USD",
      unit: "video",
    },
    isDefault: false,
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "Text prompt to guide generation",
        placeholder: "Describe the motion or action...",
        required: true,
      },
      negativePrompt: {
        name: "negativePrompt",
        type: "text",
        label: "Negative Prompt",
        description: "What to avoid in the generation",
        default:
          "worst quality, inconsistent motion, blurry, jittery, distorted",
        placeholder: "worst quality, inconsistent motion...",
      },
      resolution: {
        name: "resolution",
        type: "select",
        label: "Resolution",
        description: "Video resolution",
        default: "720p",
        options: [
          { value: "480p", label: "480p" },
          { value: "720p", label: "720p" },
        ],
      },
      aspectRatio: {
        name: "aspectRatio",
        type: "select",
        label: "Aspect Ratio",
        description: "The aspect ratio of the video",
        default: "auto",
        options: [
          { value: "auto", label: "Auto (from image)" },
          { value: "9:16", label: "9:16 (Portrait)" },
          { value: "1:1", label: "1:1 (Square)" },
          { value: "16:9", label: "16:9 (Landscape)" },
        ],
      },
      numFrames: {
        name: "numFrames",
        type: "number",
        label: "Number of Frames",
        description: "The number of frames in the video (9-161)",
        default: 121,
        min: 9,
        max: 161,
        step: 8,
      },
      frameRate: {
        name: "frameRate",
        type: "number",
        label: "Frame Rate",
        description: "The frame rate of the video",
        default: 30,
        min: 1,
        max: 60,
        step: 1,
      },
      seed: {
        name: "seed",
        type: "number",
        label: "Seed",
        description: "Random seed for generation. Leave empty for random",
        min: 0,
        max: 2147483647,
        placeholder: "random",
      },
      expandPrompt: {
        name: "expandPrompt",
        type: "boolean",
        label: "Expand Prompt",
        description: "Whether to expand the prompt using a language model",
        default: false,
      },
      reverseVideo: {
        name: "reverseVideo",
        type: "boolean",
        label: "Reverse Video",
        description: "Whether to reverse the video",
        default: false,
      },
      constantRateFactor: {
        name: "constantRateFactor",
        type: "number",
        label: "Compression Quality",
        description:
          "CRF for input compression (20=high quality, 60=low quality)",
        default: 35,
        min: 20,
        max: 60,
        step: 5,
      },
    },
    defaults: {
      prompt: "",
      negativePrompt:
        "worst quality, inconsistent motion, blurry, jittery, distorted",
      resolution: "720p",
      aspectRatio: "auto",
      numFrames: 121,
      frameRate: 30,
      expandPrompt: false,
      reverseVideo: false,
      constantRateFactor: 35,
    },
  },
  "stable-video-diffusion": {
    id: "stable-video-diffusion",
    name: "Stable Video Diffusion",
    endpoint: "fal-ai/stable-video-diffusion",
    category: "text-to-video",
    pricing: {
      costPerVideo: 0.1,
      currency: "USD",
      unit: "video",
    },
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "Text description of the video to generate",
        required: true,
        placeholder: "A cinematic shot of...",
      },
      duration: {
        name: "duration",
        type: "number",
        label: "Duration (seconds)",
        description: "Video duration in seconds",
        default: 3,
        min: 1,
        max: 5,
        step: 1,
      },
    },
    defaults: {
      prompt: "",
      duration: 3,
    },
  },
};

export function getVideoModelById(id: string): VideoModelConfig | undefined {
  return VIDEO_MODELS[id];
}

export function getVideoModelsByCategory(
  category: VideoModelConfig["category"],
): VideoModelConfig[] {
  return Object.values(VIDEO_MODELS).filter(
    (model) =>
      model.category === category ||
      (model.supportsMultipleCategories && category !== "text-to-video"),
  );
}

export function getDefaultVideoModel(
  category: VideoModelConfig["category"],
): VideoModelConfig | undefined {
  const models = getVideoModelsByCategory(category);
  return models.find((model) => model.isDefault) || models[0];
}

export function calculateVideoGenerations(
  model: VideoModelConfig,
  budget: number = 1,
): number {
  return Math.floor(budget / model.pricing.costPerVideo);
}

export function formatPricingMessage(model: VideoModelConfig): string {
  const approximateTimes = calculateVideoGenerations(model);
  return `Your request will cost $${model.pricing.costPerVideo.toFixed(2)} per ${
    model.pricing.unit
  }. For $1 you can run this model approximately ${approximateTimes} times.`;
}
