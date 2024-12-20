"use server";

import { fal } from "@fal-ai/client";

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

const AVAILABLE_MODELS = {
  "flux-pro": "fal-ai/flux-pro/v1.1-ultra",
  "flux-lora": "fal-ai/flux-lora",
  "flux-dev": "fal-ai/flux/dev",
  "flux-schnell": "fal-ai/flux/schnell",
} as const;

type AspectRatio = "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "9:21";

interface FluxProUltraInput {
  prompt: string;
  seed?: number;
  sync_mode?: boolean;
  num_images?: string;
  enable_safety_checker?: boolean;
  safety_tolerance?: "1" | "2" | "3" | "4" | "5" | "6";
  output_format?: "jpeg" | "png";
  aspect_ratio?: AspectRatio;
  raw?: boolean;
  image_url?: string;
  image_prompt_strength?: number;
}

const COST_PER_MEGAPIXEL = {
  "flux-pro": 0.05,
  "flux-dev": 0.025,
  "flux-schnell": 0.003,
  "flux-lora": 0.025,
} as const;

function calculateImageCost(width: number, height: number, model: keyof typeof AVAILABLE_MODELS): number {
  const megapixels = (width * height) / 1000000;
  const costPerMp = COST_PER_MEGAPIXEL[model as keyof typeof COST_PER_MEGAPIXEL] || 0;
  return Number((megapixels * costPerMp).toFixed(3));
}

export async function generateImage(
  apiKey: string,
  prompt: string,
  aspectRatio: AspectRatio,
  model: keyof typeof AVAILABLE_MODELS,
  numImages: number = 1,
  options?: {
    seed?: number;
    enable_safety_checker?: boolean;
    safety_tolerance?: "1" | "2" | "3" | "4" | "5" | "6";
    output_format?: "jpeg" | "png";
    raw?: boolean;
  }
): Promise<{
  status: string;
  logs?: string;
  imageUrls: string[];
  cost?: number;
}> {
  console.log("🔵 Generation Input:", {
    model: AVAILABLE_MODELS[model],
    aspectRatio,
    numImages,
    options,
    // Excluding API key and prompt for security
  });

  fal.config({
    credentials: apiKey,
  });

  try {
    const result = await fal.subscribe(AVAILABLE_MODELS[model], {
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        num_images: Math.min(Math.max(1, numImages), 4),
        enable_safety_checker: options?.enable_safety_checker ?? false,
        safety_tolerance: options?.safety_tolerance ?? "6",
        output_format: options?.output_format ?? "jpeg",
        ...(options?.seed !== undefined && { seed: options.seed }),
        ...(options?.raw !== undefined && { raw: options.raw }),
      },
      logs: true,
    });

    console.log("🟢 Generation Output:", {
      status: "success",
      images: result.data.images.map(img => ({
        url: img.url,
        width: img.width,
        height: img.height
      })),
      logs: result
    });

    if (!result?.data?.images?.length) {
      throw new Error("No images in response");
    }

    // Calculate total cost for all images
    const totalCost = result.data.images.reduce((acc, image) => {
      return acc + calculateImageCost(
        image.width || 2048,
        image.height || 2048,
        model
      );
    }, 0);

    const response = {
      status: "COMPLETED",
      imageUrls: result.data.images.map(img => img.url),
      cost: totalCost
    };

    // Add to browser storage in the client component
    return response;
  } catch (error) {
    console.error("Image generation failed:", {
      error,
      status: (error as any)?.status,
      body: (error as any)?.body,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    const errorMessage = error instanceof Error 
      ? `${error.message}${(error as any)?.status ? ` (Status: ${(error as any).status})` : ''}`
      : 'Unknown error';
      
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
}

export async function generateFluxProUltraImage({
  apiKey,
  prompt,
  seed,
  sync_mode = false,
  num_images = "1",
  enable_safety_checker = false,
  safety_tolerance = "6",
  output_format = "jpeg",
  aspect_ratio = "16:9",
  raw = false,
  image_url,
  image_prompt_strength,
}: FluxProUltraInput & { apiKey: string }): Promise<string> {
  fal.config({
    credentials: apiKey,
  });

  try {
    const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
      input: {
        prompt,
        seed,
        sync_mode,
        num_images: Number(num_images),
        enable_safety_checker,
        safety_tolerance,
        output_format,
        aspect_ratio,
        raw,
        ...(image_url && { image_url }),
        ...(image_prompt_strength && { image_prompt_strength }),
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log("Queue update:", update);
        if (update.status === "IN_PROGRESS") {
          console.log("Generation progress:", update.logs);
        }
      },
    });

    console.log("FluxPro generation response:", {
      images: result.data.images,
      logs: result
    });

    if (!result?.data?.images?.[0]?.url) {
      throw new Error("No image URL in response");
    }

    return result.data.images[0].url;
  } catch (error) {
    console.error("Image generation failed:", {
      error,
      status: (error as any)?.status,
      body: (error as any)?.body,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    const errorMessage = error instanceof Error 
      ? `${error.message}${(error as any)?.status ? ` (Status: ${(error as any).status})` : ''}`
      : 'Unknown error';
      
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
}

export async function generateImageRealtime(
  apiKey: string,
  prompt: string,
  aspectRatio: AspectRatio,
  model: keyof typeof AVAILABLE_MODELS
) {
  fal.config({
    credentials: apiKey,
    proxyUrl: "/api/fal/proxy" // Make sure you have the proxy setup
  });

  const connection = fal.realtime.connect(AVAILABLE_MODELS[model], {
    connectionKey: "image-generation",
    onResult: (result) => {
      console.log("Realtime generation response:", {
        images: result.data.images,
        logs: result.logs,
      });
      return {
        status: "COMPLETED",
        imageUrl: result.data.images[0].url
      };
    },
  });

  connection.send({
    prompt,
    aspect_ratio: aspectRatio,
    output_format: "jpeg",
    enable_safety_checker: false,
  });
}

