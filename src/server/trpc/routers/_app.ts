import { z } from "zod";
import { rateLimitedProcedure, publicProcedure, router } from "../init";
import { tracked } from "@trpc/server";
import { createFalClient } from "@fal-ai/client";
import sharp from "sharp";

const fal = createFalClient({
  credentials: () => process.env.FAL_KEY as string,
});

// Helper function to check rate limits or use custom API key
async function getFalClient(apiKey: string | undefined, ctx: any) {
  if (apiKey) {
    return createFalClient({
      credentials: () => apiKey,
    });
  }

  // Apply rate limiting when using default key
  const { shouldLimitRequest } = await import("@/lib/ratelimit");
  const { createRateLimiter } = await import("@/lib/ratelimit");

  const limiter = {
    perMinute: createRateLimiter(50, "60 s"),
    perHour: createRateLimiter(250, "60 m"),
    perDay: createRateLimiter(500, "24 h"),
  };

  const ip =
    ctx.req?.headers.get?.("x-forwarded-for") ||
    ctx.req?.headers.get?.("x-real-ip") ||
    "unknown";

  const limiterResult = await shouldLimitRequest(limiter, ip);
  if (limiterResult.shouldLimitRequest) {
    throw new Error(
      `Rate limit exceeded per ${limiterResult.period}. Add your FAL API key to bypass rate limits.`,
    );
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

// Video models
const VIDEO_MODELS = {
  textToVideo: "fal-ai/stable-video-diffusion",
  imageToVideoLite: "fal-ai/bytedance/seedance/v1/lite/image-to-video", // SeeDANCE Lite version
  imageToVideoPro: "fal-ai/bytedance/seedance/v1/pro/image-to-video", // SeeDANCE Pro version
  videoToVideo: "fal-ai/stable-video-diffusion-img2vid", // This is a placeholder, replace with actual model when available
};

export const appRouter = router({
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
        const falClient = await getFalClient(input.apiKey, ctx);

        // Create a unique ID for this transformation
        const transformationId = `vidtrans_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Yield initial progress
        yield tracked(`${transformationId}_start`, {
          type: "progress",
          progress: 0,
          status: "Starting video transformation...",
        });

        // Start streaming from fal.ai
        const stream = await falClient.stream(VIDEO_MODELS.videoToVideo, {
          input: {
            video_url: input.videoUrl,
            prompt: input.prompt || "",
            style: input.styleId || "",
            num_inference_steps: 25,
            guidance_scale: 7.5,
          },
        });

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

        // Check if we have a valid video URL
        if (!result.video_url) {
          yield tracked(`${transformationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Send the final video
        yield tracked(`${transformationId}_complete`, {
          type: "complete",
          videoUrl: result.video_url,
          duration: result.duration || 3, // Default to 3 seconds if not provided
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
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string().optional(),
        duration: z.number().optional().default(5),
        modelVersion: z.enum(["lite", "pro"]).optional().default("lite"),
        resolution: z
          .enum(["480p", "720p", "1080p"])
          .optional()
          .default("720p"),
        cameraFixed: z.boolean().optional().default(false),
        seed: z.number().optional().default(-1),
        apiKey: z.string().optional(),
      }),
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx);

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

        // Determine which model to use based on the modelVersion
        const modelEndpoint =
          input.modelVersion === "pro"
            ? VIDEO_MODELS.imageToVideoPro
            : VIDEO_MODELS.imageToVideoLite;

        console.log(
          `Calling SeeDANCE ${input.modelVersion.toUpperCase()} API with parameters:`,
          {
            image_url: input.imageUrl,
            prompt,
            duration,
            resolution: input.resolution,
            camera_fixed: input.cameraFixed,
            seed: input.seed,
          },
        );

        const result = await falClient.subscribe(modelEndpoint, {
          input: {
            image_url: input.imageUrl,
            prompt, // Descriptive prompt
            duration, // Only "5" or "10" are allowed
            resolution: input.resolution, // Use selected resolution
            camera_fixed:
              input.cameraFixed !== undefined ? input.cameraFixed : false, // Use explicit camera fixed setting
            seed: input.seed !== undefined ? input.seed : -1, // Use provided seed or default to random
          },
        });

        // Yield progress update
        yield tracked(`${generationId}_progress`, {
          type: "progress",
          progress: 100,
          status: "Video generation complete",
        });

        // Check if we have a valid video URL
        if (!result.data?.video?.url) {
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Send the final video
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          videoUrl: result.data.video.url,
          duration: input.duration,
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
        const falClient = await getFalClient(input.apiKey, ctx);

        // Create a unique ID for this generation
        const generationId = `vid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Yield initial progress
        yield tracked(`${generationId}_start`, {
          type: "progress",
          progress: 0,
          status: "Starting video generation...",
        });

        // Start streaming from fal.ai
        const stream = await falClient.stream(VIDEO_MODELS.textToVideo, {
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
        });

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

        // Check if we have a valid video URL
        if (!result.video_url) {
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Send the final video
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          videoUrl: result.video_url,
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
          new Blob([segmentedImage], { type: "image/png" }),
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
