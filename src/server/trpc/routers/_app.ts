import { z } from "zod";
import { rateLimitedProcedure, publicProcedure, router } from "../init";
import { tracked } from "@trpc/server";
import { createFalClient } from "@fal-ai/client";
import sharp from "sharp";
import { canvasRouter } from "./canvas";

const fal = createFalClient({
  credentials: () => process.env.FAL_KEY as string,
});

// Helper function to check rate limits or use custom API key
async function getFalClient(
  apiKey: string | undefined,
  ctx: any,
  isVideo: boolean = false,
) {
  if (apiKey) {
    return createFalClient({
      credentials: () => apiKey,
    });
  }

  // Apply rate limiting when using default key
  const { shouldLimitRequest } = await import("@/lib/ratelimit");
  const { createRateLimiter } = await import("@/lib/ratelimit");

  // Different rate limits for video vs regular operations
  const limiter = isVideo
    ? {
        perMinute: createRateLimiter(1, "60 s"),
        perHour: createRateLimiter(10, "60 m"),
        perDay: createRateLimiter(50, "24 h"),
      }
    : {
        perMinute: createRateLimiter(50, "60 s"),
        perHour: createRateLimiter(250, "60 m"),
        perDay: createRateLimiter(500, "24 h"),
      };

  const ip =
    ctx.req?.headers.get?.("x-forwarded-for") ||
    ctx.req?.headers.get?.("x-real-ip") ||
    "unknown";

  const limiterResult = await shouldLimitRequest(
    limiter,
    ip,
    isVideo ? "video" : undefined,
  );
  if (limiterResult.shouldLimitRequest) {
    const errorMessage = isVideo
      ? `Video generation rate limit exceeded: 1 video per ${limiterResult.period}. Add your FAL API key to bypass rate limits.`
      : `Rate limit exceeded per ${limiterResult.period}. Add your FAL API key to bypass rate limits.`;
    throw new Error(errorMessage);
  }

  return fal;
}

// Helper function to download image
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

import { getVideoModelById, VIDEO_MODELS } from "@/lib/video-models";

export const appRouter = router({
  canvas: canvasRouter,
  transformVideo: publicProcedure
    .input(
      z.object({
        videoUrl: z.string().url(),
        prompt: z.string().optional(),
        styleId: z.string().optional(),
        apiKey: z.string().optional(),
      }),
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx, true);

        // Create a unique ID for this transformation
        const transformationId = `vidtrans_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Yield initial progress
        yield tracked(`${transformationId}_start`, {
          type: "progress",
          progress: 0,
          status: "Starting video transformation...",
        });

        // Start streaming from fal.ai
        const stream = await falClient.stream(
          VIDEO_MODELS["stable-video-diffusion"].endpoint,
          {
            input: {
              video_url: input.videoUrl,
              prompt: input.prompt || "",
              style: input.styleId || "",
              num_inference_steps: 25,
              guidance_scale: 7.5,
            },
          },
        );

        let eventIndex = 0;

        // Stream events as they come
        for await (const event of stream) {
          if (signal?.aborted) {
            break;
          }

          const eventId = `${transformationId}_${eventIndex++}`;

          // Calculate progress percentage if available
          const progress =
            event.progress !== undefined
              ? Math.floor(event.progress * 100)
              : eventIndex * 5; // Fallback progress estimation

          yield tracked(eventId, {
            type: "progress",
            progress,
            status: event.status || "Transforming video...",
            data: event,
          });
        }

        // Get the final result
        const result = await stream.done();

        // Handle different response formats
        const videoUrl =
          (result as any).data?.video?.url ||
          (result as any).data?.url ||
          (result as any).video_url;
        if (!videoUrl) {
          yield tracked(`${transformationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Send the final video
        yield tracked(`${transformationId}_complete`, {
          type: "complete",
          videoUrl: videoUrl,
          duration: (result as any).duration || 3, // Default to 3 seconds if not provided
        });
      } catch (error) {
        console.error("Error in video transformation:", error);
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to transform video",
        });
      }
    }),
  generateImageToVideo: publicProcedure
    .input(
      z
        .object({
          imageUrl: z.string().url(),
          prompt: z.string().optional(),
          duration: z.number().optional().default(5),
          modelId: z.string().optional(),
          resolution: z
            .enum(["480p", "720p", "1080p"])
            .optional()
            .default("720p"),
          cameraFixed: z.boolean().optional().default(false),
          seed: z.number().optional().default(-1),
          apiKey: z.string().optional(),
        })
        .passthrough(), // Allow additional fields for different models
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx, true);

        // Create a unique ID for this generation
        const generationId = `img2vid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Yield initial progress
        yield tracked(`${generationId}_start`, {
          type: "progress",
          progress: 0,
          status: "Starting image-to-video conversion...",
        });

        // Use subscribe instead of stream for SeeDANCE model
        // First yield a progress update to show we're starting
        yield tracked(`${generationId}_starting`, {
          type: "progress",
          progress: 10,
          status: "Starting video generation...",
        });

        // Call the SeeDANCE API using subscribe method
        // Convert duration to one of the allowed values: "5" or "10"
        const duration = input.duration <= 5 ? "5" : "10";

        // Ensure prompt is descriptive enough
        const prompt =
          input.prompt || "A smooth animation of the image with natural motion";

        // Determine model from modelId or use default
        const modelId = input.modelId || "ltx-video"; // Default to ltx-video
        const model = getVideoModelById(modelId);
        if (!model) {
          throw new Error(`Unknown model ID: ${modelId}`);
        }
        const modelEndpoint = model.endpoint;

        // Build input parameters based on model configuration
        let inputParams: any = {};

        if (input.modelId) {
          const model = getVideoModelById(input.modelId);
          if (model) {
            // Map our generic field names to model-specific field names
            if (model.id === "ltx-video-extend") {
              // Use the dedicated extend endpoint format
              let startFrame = (input as any).startFrameNum ?? 32;

              // Ensure startFrame is a multiple of 8
              if (startFrame % 8 !== 0) {
                // Round to nearest multiple of 8
                startFrame = Math.round(startFrame / 8) * 8;
                console.log(
                  `Adjusted start frame from ${(input as any).startFrameNum} to ${startFrame} (must be multiple of 8)`,
                );
              }

              inputParams = {
                video: {
                  video_url: input.imageUrl, // imageUrl contains the video URL for extension
                  // Use the validated startFrame (already defaulted and rounded)
                  start_frame_num: startFrame,
                  reverse_video:
                    (input as any).reverseVideoConditioning ?? false,
                  limit_num_frames: (input as any).limitNumFrames ?? false,
                  resample_fps: (input as any).resampleFps ?? false,
                  strength: (input as any).strength ?? 1,
                  target_fps: (input as any).targetFps ?? 30,
                  max_num_frames: (input as any).maxNumFrames ?? 121,
                  conditioning_type: (input as any).conditioningType ?? "rgb",
                  preprocess: (input as any).preprocess ?? false,
                },
                prompt: input.prompt || model.defaults.prompt,
                negative_prompt:
                  (input as any).negativePrompt ||
                  model.defaults.negativePrompt,
                resolution: input.resolution || model.defaults.resolution,
                aspect_ratio:
                  (input as any).aspectRatio || model.defaults.aspectRatio,
                num_frames:
                  (input as any).numFrames || model.defaults.numFrames,
                first_pass_num_inference_steps:
                  (input as any).firstPassNumInferenceSteps || 30,
                first_pass_skip_final_steps:
                  (input as any).firstPassSkipFinalSteps || 3,
                second_pass_num_inference_steps:
                  (input as any).secondPassNumInferenceSteps || 30,
                second_pass_skip_initial_steps:
                  (input as any).secondPassSkipInitialSteps || 17,
                frame_rate:
                  (input as any).frameRate || model.defaults.frameRate,
                expand_prompt:
                  (input as any).expandPrompt ?? model.defaults.expandPrompt,
                reverse_video:
                  (input as any).reverseVideo ?? model.defaults.reverseVideo,
                enable_safety_checker:
                  (input as any).enableSafetyChecker ??
                  model.defaults.enableSafetyChecker,
                constant_rate_factor:
                  (input as any).constantRateFactor ||
                  model.defaults.constantRateFactor,
                seed:
                  input.seed !== undefined && input.seed !== -1
                    ? input.seed
                    : undefined,
              };
            } else if (model.id === "ltx-video-multiconditioning") {
              // Handle multiconditioning model with support for video-to-video
              const isVideoToVideo = (input as any).isVideoToVideo;
              const isVideoExtension = (input as any).isVideoExtension;

              inputParams = {
                prompt: input.prompt || "",
                negative_prompt:
                  (input as any).negativePrompt ||
                  model.defaults.negativePrompt,
                resolution: input.resolution || model.defaults.resolution,
                aspect_ratio:
                  (input as any).aspectRatio || model.defaults.aspectRatio,
                num_frames:
                  (input as any).numFrames || model.defaults.numFrames,
                frame_rate:
                  (input as any).frameRate || model.defaults.frameRate,
                first_pass_num_inference_steps:
                  (input as any).firstPassNumInferenceSteps ||
                  model.defaults.firstPassNumInferenceSteps,
                first_pass_skip_final_steps:
                  (input as any).firstPassSkipFinalSteps ||
                  model.defaults.firstPassSkipFinalSteps,
                second_pass_num_inference_steps:
                  (input as any).secondPassNumInferenceSteps ||
                  model.defaults.secondPassNumInferenceSteps,
                second_pass_skip_initial_steps:
                  (input as any).secondPassSkipInitialSteps ||
                  model.defaults.secondPassSkipInitialSteps,
                expand_prompt:
                  (input as any).expandPrompt ?? model.defaults.expandPrompt,
                reverse_video:
                  (input as any).reverseVideo ?? model.defaults.reverseVideo,
                enable_safety_checker:
                  (input as any).enableSafetyChecker ??
                  model.defaults.enableSafetyChecker,
                constant_rate_factor:
                  (input as any).constantRateFactor ||
                  model.defaults.constantRateFactor,
                seed:
                  input.seed !== undefined && input.seed !== -1
                    ? input.seed
                    : undefined,
              };

              // Add image or video conditioning based on the type
              if (isVideoToVideo) {
                if (isVideoExtension) {
                  // For video extension, use conditioning that focuses on the end of the video
                  inputParams.videos = [
                    {
                      video_url: input.imageUrl, // imageUrl contains the video URL
                      conditioning_type: "rgb",
                      preprocess: true,
                      start_frame_num: 24, // Use frames from near the end
                      strength: 1,
                      limit_num_frames: true,
                      max_num_frames: 121,
                      resample_fps: true,
                      target_fps: 30,
                      reverse_video: false,
                    },
                  ];
                  // Modify prompt to indicate continuation
                  if (
                    inputParams.prompt &&
                    !inputParams.prompt.toLowerCase().includes("continue") &&
                    !inputParams.prompt.toLowerCase().includes("extend")
                  ) {
                    inputParams.prompt =
                      "Continue this video naturally. " + inputParams.prompt;
                  }
                } else {
                  // Regular video-to-video transformation
                  inputParams.videos = [
                    {
                      video_url: input.imageUrl, // imageUrl contains the video URL
                      start_frame_num: 0,
                      end_frame_num: -1, // Use all frames
                    },
                  ];
                }
              } else {
                inputParams.images = [
                  {
                    image_url: input.imageUrl,
                    strength: 1.0,
                    start_frame_num: 0,
                  },
                ];
              }
            } else if (model.id === "ltx-video") {
              inputParams = {
                image_url: input.imageUrl,
                prompt: input.prompt || "",
                negative_prompt:
                  (input as any).negativePrompt ||
                  model.defaults.negativePrompt,
                resolution: input.resolution || model.defaults.resolution,
                aspect_ratio:
                  (input as any).aspectRatio || model.defaults.aspectRatio,
                num_frames:
                  (input as any).numFrames || model.defaults.numFrames,
                frame_rate:
                  (input as any).frameRate || model.defaults.frameRate,
                expand_prompt:
                  (input as any).expandPrompt ?? model.defaults.expandPrompt,
                reverse_video:
                  (input as any).reverseVideo ?? model.defaults.reverseVideo,
                constant_rate_factor:
                  (input as any).constantRateFactor ||
                  model.defaults.constantRateFactor,
                seed:
                  input.seed !== undefined && input.seed !== -1
                    ? input.seed
                    : undefined,
                enable_safety_checker: true,
              };
            } else if (modelId === "bria-video-background-removal") {
              // Bria video background removal
              inputParams = {
                video_url: input.imageUrl, // imageUrl contains the video URL
                background_color:
                  (input as any).backgroundColor ||
                  model.defaults.backgroundColor ||
                  "Black",
              };
            } else {
              // SeeDANCE models and others
              inputParams = {
                image_url: input.imageUrl,
                prompt: input.prompt || prompt,
                duration: duration || input.duration,
                resolution: input.resolution,
                camera_fixed:
                  input.cameraFixed !== undefined ? input.cameraFixed : false,
                seed: input.seed !== undefined ? input.seed : -1,
              };
            }
          }
        } else {
          // Backward compatibility
          inputParams = {
            image_url: input.imageUrl,
            prompt: prompt,
            duration: duration,
            resolution: input.resolution,
            camera_fixed:
              input.cameraFixed !== undefined ? input.cameraFixed : false,
            seed: input.seed !== undefined ? input.seed : -1,
          };
        }

        console.log(
          `Calling ${modelEndpoint} with parameters:`,
          JSON.stringify(inputParams, null, 2),
        );

        let result;
        try {
          result = await falClient.subscribe(modelEndpoint, {
            input: inputParams,
          });
        } catch (apiError: any) {
          console.error("FAL API Error Details:", {
            message: apiError.message,
            status: apiError.status,
            statusText: apiError.statusText,
            body: apiError.body,
            response: apiError.response,
            data: apiError.data,
            // Log the exact parameters that were sent
            sentParameters: inputParams,
            endpoint: modelEndpoint,
          });

          // Log specific validation errors if available
          if (apiError.body?.detail) {
            console.error("Validation error details:", apiError.body.detail);
          }

          // Re-throw with more context
          if (
            apiError.status === 422 ||
            apiError.message?.includes("Unprocessable Entity")
          ) {
            let errorDetail =
              apiError.body?.detail ||
              apiError.message ||
              "Please check the video format and parameters";
            // If errorDetail is an object, stringify it
            if (typeof errorDetail === "object") {
              errorDetail = JSON.stringify(errorDetail);
            }
            throw new Error(
              `Invalid parameters for ${modelEndpoint}: ${errorDetail}`,
            );
          }
          throw apiError;
        }

        // Yield progress update
        yield tracked(`${generationId}_progress`, {
          type: "progress",
          progress: 100,
          status: "Video generation complete",
        });

        // Handle different response formats from different models
        const videoUrl =
          result.data?.video?.url ||
          result.data?.url ||
          (result as any).video?.url ||
          (result as any).url;
        if (!videoUrl) {
          console.error("No video URL found in response:", result);
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Extract duration from response or use input value
        const videoDuration = result.data?.duration || input.duration || 5;

        // Send the final video
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          videoUrl: videoUrl,
          duration: videoDuration,
        });
      } catch (error) {
        console.error("Error in image-to-video conversion:", error);
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to convert image to video",
        });
      }
    }),

  generateTextToVideo: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        duration: z.number().optional().default(3),
        styleId: z.string().optional(),
        apiKey: z.string().optional(),
      }),
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx, true);

        // Create a unique ID for this generation
        const generationId = `vid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Yield initial progress
        yield tracked(`${generationId}_start`, {
          type: "progress",
          progress: 0,
          status: "Starting video generation...",
        });

        // Start streaming from fal.ai
        const stream = await falClient.stream(
          VIDEO_MODELS["stable-video-diffusion"].endpoint,
          {
            input: {
              prompt: input.prompt,
              num_frames: Math.floor(input.duration * 24), // Convert seconds to frames at 24fps
              num_inference_steps: 25,
              guidance_scale: 7.5,
              width: 576,
              height: 320,
              fps: 24,
              motion_bucket_id: 127, // Higher values = more motion
              seed: Math.floor(Math.random() * 2147483647),
            },
          },
        );

        let eventIndex = 0;

        // Stream events as they come
        for await (const event of stream) {
          if (signal?.aborted) {
            break;
          }

          const eventId = `${generationId}_${eventIndex++}`;

          // Calculate progress percentage if available
          const progress =
            event.progress !== undefined
              ? Math.floor(event.progress * 100)
              : eventIndex * 5; // Fallback progress estimation

          yield tracked(eventId, {
            type: "progress",
            progress,
            status: event.status || "Generating video...",
            data: event,
          });
        }

        // Get the final result
        const result = await stream.done();

        // Handle different response formats
        const videoUrl =
          (result as any).data?.video?.url ||
          (result as any).data?.url ||
          (result as any).video_url;
        if (!videoUrl) {
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Send the final video
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          videoUrl: videoUrl,
          duration: input.duration,
        });
      } catch (error) {
        console.error("Error in text-to-video generation:", error);
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error ? error.message : "Failed to generate video",
        });
      }
    }),
  removeBackground: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        apiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const falClient = await getFalClient(input.apiKey, ctx);

        const result = await falClient.subscribe(
          "fal-ai/bria/background/remove",
          {
            input: {
              image_url: input.imageUrl,
              sync_mode: true,
            },
          },
        );

        return {
          url: result.data.image.url,
        };
      } catch (error) {
        console.error("Error removing background:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to remove background",
        );
      }
    }),

  isolateObject: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        textInput: z.string(),
        apiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const falClient = await getFalClient(input.apiKey, ctx);

        // Use the FAL client with EVF-SAM2 for segmentation
        console.log("Using FAL client for EVF-SAM2...");
        console.log("FAL_KEY present:", !!process.env.FAL_KEY);
        console.log("Input:", {
          imageUrl: input.imageUrl,
          prompt: input.textInput,
        });

        // Use EVF-SAM2 to get the segmentation mask
        const result = await falClient.subscribe("fal-ai/evf-sam", {
          input: {
            image_url: input.imageUrl,
            prompt: input.textInput,
            mask_only: true, // Get the binary mask
            fill_holes: true, // Clean up the mask
            expand_mask: 2, // Slightly expand to avoid cutting edges
          },
        });

        console.log("FAL API Success Response:", result.data);

        // Check if we got a valid mask
        if (!result.data?.image?.url) {
          throw new Error("No objects found matching the description");
        }

        // Download both the original image and the mask
        console.log("Downloading original image and mask...");
        const [originalBuffer, maskBuffer] = await Promise.all([
          downloadImage(input.imageUrl),
          downloadImage(result.data.image.url),
        ]);

        // Apply mask to original image
        console.log("Applying mask to extract segmented object...");

        // Load images with sharp
        const originalImage = sharp(originalBuffer);
        const maskImage = sharp(maskBuffer);

        // Get metadata to ensure dimensions match
        const [originalMetadata, maskMetadata] = await Promise.all([
          originalImage.metadata(),
          maskImage.metadata(),
        ]);

        console.log(
          `Original image: ${originalMetadata.width}x${originalMetadata.height}`,
        );
        console.log(`Mask image: ${maskMetadata.width}x${maskMetadata.height}`);

        // Resize mask to match original if needed
        let processedMask = maskImage;
        if (
          originalMetadata.width !== maskMetadata.width ||
          originalMetadata.height !== maskMetadata.height
        ) {
          console.log("Resizing mask to match original image dimensions...");
          processedMask = maskImage.resize(
            originalMetadata.width,
            originalMetadata.height,
          );
        }

        // Apply the mask as an alpha channel
        // First ensure both images have alpha channels
        const [rgbaOriginal, alphaMask] = await Promise.all([
          originalImage
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true }),
          processedMask
            .grayscale() // Convert to single channel
            .raw()
            .toBuffer({ resolveWithObject: true }),
        ]);

        console.log("Original image buffer info:", rgbaOriginal.info);
        console.log("Mask buffer info:", alphaMask.info);

        // Create new image buffer with mask applied as alpha
        const outputBuffer = Buffer.alloc(rgbaOriginal.data.length);

        // Apply mask: copy RGB from original, use mask value as alpha
        for (
          let i = 0;
          i < rgbaOriginal.info.width * rgbaOriginal.info.height;
          i++
        ) {
          const rgbOffset = i * 4;
          const maskOffset = i; // Grayscale mask has 1 channel

          // Copy RGB values
          outputBuffer[rgbOffset] = rgbaOriginal.data[rgbOffset]; // R
          outputBuffer[rgbOffset + 1] = rgbaOriginal.data[rgbOffset + 1]; // G
          outputBuffer[rgbOffset + 2] = rgbaOriginal.data[rgbOffset + 2]; // B

          // Use mask value as alpha (white = opaque, black = transparent)
          outputBuffer[rgbOffset + 3] = alphaMask.data[maskOffset];
        }

        // Create final image from the buffer
        const segmentedImage = await sharp(outputBuffer, {
          raw: {
            width: rgbaOriginal.info.width,
            height: rgbaOriginal.info.height,
            channels: 4,
          },
        })
          .png()
          .toBuffer();

        // Upload the segmented image to FAL storage
        console.log("Uploading segmented image to storage...");
        const uploadResult = await falClient.storage.upload(
          new Blob([segmentedImage as unknown as BlobPart], {
            type: "image/png",
          }),
        );

        // Return the URL of the segmented object
        console.log("Returning segmented image URL:", uploadResult);
        console.log("Original mask URL:", result.data.image.url);

        return {
          url: uploadResult,
          maskUrl: result.data.image.url, // Also return mask URL for reference
        };
      } catch (error: any) {
        console.error("Error isolating object:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          body: error.body,
          data: error.data,
        });

        // Check for enterprise-only error (shouldn't happen with EVF-SAM2)
        if (
          error.body?.detail?.includes("not enterprise ready") ||
          error.message?.includes("not enterprise ready")
        ) {
          throw new Error(
            "This model requires an enterprise FAL account. Please contact FAL support for access or use the 'Remove Background' feature instead.",
          );
        }

        // Check for other specific error types
        if (error.status === 403 || error.message?.includes("Forbidden")) {
          throw new Error(
            "API access denied. Please check your FAL API key permissions.",
          );
        }

        throw new Error(error.message || "Failed to isolate object");
      }
    }),

  generateTextToImage: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        loraUrl: z.string().url().optional(),
        seed: z.number().optional(),
        imageSize: z
          .enum([
            "landscape_4_3",
            "portrait_4_3",
            "square",
            "landscape_16_9",
            "portrait_16_9",
          ])
          .optional(),
        apiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const falClient = await getFalClient(input.apiKey, ctx);

        const loras = input.loraUrl ? [{ path: input.loraUrl, scale: 1 }] : [];

        const result = await falClient.subscribe(
          "fal-ai/flux-kontext-lora/text-to-image",
          {
            input: {
              prompt: input.prompt,
              image_size: input.imageSize || "square",
              num_inference_steps: 30,
              guidance_scale: 2.5,
              num_images: 1,
              enable_safety_checker: true,
              output_format: "png",
              seed: input.seed,
              loras,
            },
          },
        );

        // Handle different possible response structures
        const resultData = (result as any).data || result;
        if (!resultData.images?.[0]) {
          throw new Error("No image generated");
        }

        return {
          url: resultData.images[0].url,
          width: resultData.images[0].width,
          height: resultData.images[0].height,
          seed: resultData.seed,
        };
      } catch (error) {
        console.error("Error in text-to-image generation:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to generate image",
        );
      }
    }),

  generateImageStream: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string(),
        loraUrl: z.string().url().optional(),
        seed: z.number().optional(),
        lastEventId: z.string().optional(),
        apiKey: z.string().optional(),
      }),
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx);

        const loras = input.loraUrl ? [{ path: input.loraUrl, scale: 1 }] : [];

        // Create a unique ID for this generation
        const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Start streaming from fal.ai
        const stream = await falClient.stream("fal-ai/flux-kontext-lora", {
          input: {
            image_url: input.imageUrl,
            prompt: input.prompt,
            num_inference_steps: 30,
            guidance_scale: 2.5,
            num_images: 1,
            enable_safety_checker: true,
            resolution_mode: "match_input",
            seed: input.seed,
            loras,
          },
        });

        let eventIndex = 0;

        // Stream events as they come
        for await (const event of stream) {
          if (signal?.aborted) {
            break;
          }

          const eventId = `${generationId}_${eventIndex++}`;

          yield tracked(eventId, {
            type: "progress",
            data: event,
          });
        }

        // Get the final result
        const result = await stream.done();

        // Handle different possible response structures
        const resultData = (result as any).data || result;
        const images = resultData.images || [];
        if (!images?.[0]) {
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: "No image generated",
          });
          return;
        }

        // Send the final image
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          imageUrl: images[0].url,
          seed: resultData.seed,
        });
      } catch (error) {
        console.error("Error in image generation stream:", error);
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error ? error.message : "Failed to generate image",
        });
      }
    }),
});

export type AppRouter = typeof appRouter;
