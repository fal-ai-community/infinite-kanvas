import type { PlacedImage } from "@/types/canvas";
import type { CanvasElement } from "@/lib/storage";

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

// Helper to convert PlacedImage to storage format
export const imageToCanvasElement = (image: PlacedImage): CanvasElement => ({
  id: image.id,
  type: "image",
  imageId: image.id, // We'll use the same ID for both
  transform: {
    x: image.x,
    y: image.y,
    scale: 1, // We store width/height separately, so scale is 1
    rotation: image.rotation,
    ...(image.cropX !== undefined && {
      cropBox: {
        x: image.cropX,
        y: image.cropY || 0,
        width: image.cropWidth || 1,
        height: image.cropHeight || 1,
      },
    }),
  },
  zIndex: 0, // We'll use array order instead
  width: image.width,
  height: image.height,
});

// Convert canvas coordinates to screen coordinates
export const canvasToScreen = (
  canvasX: number,
  canvasY: number,
  viewport: Viewport,
): { x: number; y: number } => {
  return {
    x: canvasX * viewport.scale + viewport.x,
    y: canvasY * viewport.scale + viewport.y,
  };
};

// Calculate bounding box for an image considering rotation
export const calculateBoundingBox = (
  image: PlacedImage,
): { x: number; y: number; width: number; height: number } => {
  const { x, y, width, height, rotation } = image;

  // If no rotation, return simple bounding box
  if (!rotation || rotation === 0) {
    return {
      x,
      y,
      width,
      height,
    };
  }

  // Convert rotation from degrees to radians
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Calculate the four corners of the original rectangle
  const corners = [
    { x: 0, y: 0 }, // top-left
    { x: width, y: 0 }, // top-right
    { x: width, y: height }, // bottom-right
    { x: 0, y: height }, // bottom-left
  ];

  // Rotate each corner around the top-left corner (0,0)
  const rotatedCorners = corners.map((corner) => ({
    x: corner.x * cos - corner.y * sin,
    y: corner.x * sin + corner.y * cos,
  }));

  // Find the bounding box of the rotated corners
  const xs = rotatedCorners.map((c) => c.x);
  const ys = rotatedCorners.map((c) => c.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: x + minX,
    y: y + minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

// Calculate the bounding box of selected images
export const calculateSelectionBounds = (
  images: PlacedImage[],
  selectedIds: string[],
) => {
  if (selectedIds.length === 0) return null;

  const selectedImages = images.filter((img) => selectedIds.includes(img.id));
  if (selectedImages.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedImages.forEach((image) => {
    const bounds = calculateBoundingBox(image);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

// Find empty space on the canvas for an image
export const findEmptySpaceForImage = (
  image: PlacedImage,
  allImages: PlacedImage[],
  index: number = 0,
  gap: number = 50,
): { x: number; y: number } => {
  // Filter out the current image from the list
  const otherImages = allImages.filter((img) => img.id !== image.id);

  if (otherImages.length === 0) {
    // If no other images, place at origin
    return { x: 0, y: 0 };
  }

  // Find the rightmost edge of all images
  let rightmostX = -Infinity;
  let topY = Infinity;

  otherImages.forEach((img) => {
    const bounds = calculateBoundingBox(img);
    rightmostX = Math.max(rightmostX, bounds.x + bounds.width);
    topY = Math.min(topY, bounds.y);
  });

  // Position new image to the right of existing images
  // If multiple images are being reset, offset them horizontally
  const x = rightmostX + gap + index * (image.width + gap);
  const y = topY;

  // Check if this position overlaps with any existing image
  const proposedBounds = {
    x,
    y,
    width: image.width,
    height: image.height,
  };

  // Simple overlap check
  let overlaps = false;
  for (const otherImage of otherImages) {
    const otherBounds = calculateBoundingBox(otherImage);
    if (
      proposedBounds.x < otherBounds.x + otherBounds.width &&
      proposedBounds.x + proposedBounds.width > otherBounds.x &&
      proposedBounds.y < otherBounds.y + otherBounds.height &&
      proposedBounds.y + proposedBounds.height > otherBounds.y
    ) {
      overlaps = true;
      break;
    }
  }

  // If overlaps, try positioning below the existing images
  if (overlaps) {
    let bottomY = -Infinity;
    otherImages.forEach((img) => {
      const bounds = calculateBoundingBox(img);
      bottomY = Math.max(bottomY, bounds.y + bounds.height);
    });

    return {
      x: gap + index * (image.width + gap),
      y: bottomY + gap,
    };
  }

  return { x, y };
};

// Check if two images overlap or are too close
export const checkImageOverlapOrProximity = (
  image1: PlacedImage,
  image2: PlacedImage,
  minGap: number = 10,
): boolean => {
  // Get bounding boxes for both images (considering rotation)
  const bounds1 = calculateBoundingBox(image1);
  const bounds2 = calculateBoundingBox(image2);

  // Add gap to bounds for proximity check
  const expandedBounds1 = {
    x: bounds1.x - minGap,
    y: bounds1.y - minGap,
    width: bounds1.width + minGap * 2,
    height: bounds1.height + minGap * 2,
  };

  // Check if expanded bounds overlap
  return (
    expandedBounds1.x < bounds2.x + bounds2.width &&
    expandedBounds1.x + expandedBounds1.width > bounds2.x &&
    expandedBounds1.y < bounds2.y + bounds2.height &&
    expandedBounds1.y + expandedBounds1.height > bounds2.y
  );
};

// Check if an image needs resetting (rotated, wrong size, or overlapping/too close to others)
export const imageNeedsReset = (
  image: PlacedImage,
  allImages: PlacedImage[],
  minGap: number = 10,
  resetSize: number = 200,
): boolean => {
  // Check if rotated
  if (image.rotation !== 0) {
    return true;
  }

  // Check if size differs from reset size (with small tolerance for aspect ratio adjustments)
  const aspectRatio = image.width / image.height;
  let expectedWidth = resetSize;
  let expectedHeight = resetSize / aspectRatio;

  if (expectedHeight > resetSize) {
    expectedHeight = resetSize;
    expectedWidth = resetSize * aspectRatio;
  }

  const tolerance = 1; // Allow 1px difference due to rounding
  if (
    Math.abs(image.width - expectedWidth) > tolerance ||
    Math.abs(image.height - expectedHeight) > tolerance
  ) {
    return true;
  }

  // Check if overlapping or too close to any other image
  for (const otherImage of allImages) {
    if (otherImage.id === image.id) continue;

    if (checkImageOverlapOrProximity(image, otherImage, minGap)) {
      return true;
    }
  }

  return false;
};

// Calculate bounding box from an array of coordinates and dimensions
export const calculateBoundsFromCoordinates = (
  items: Array<{ x: number; y: number; width: number; height: number }>,
) => {
  if (items.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  items.forEach((item) => {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};
