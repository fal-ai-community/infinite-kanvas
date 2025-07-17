import React from "react";
import type { PlacedImage } from "@/types/canvas";
import { canvasToScreen, type Viewport } from "@/utils/canvas-utils";

interface DimensionDisplayProps {
  selectedImages: PlacedImage[];
  viewport: Viewport;
}

export const DimensionDisplay: React.FC<DimensionDisplayProps> = ({
  selectedImages,
  viewport,
}) => {
  // Only show for single image selection to avoid clutter
  if (selectedImages.length !== 1) return null;

  const image = selectedImages[0];

  // Calculate the API dimensions (what gets sent to generation API)
  const getApiDimensions = async (img: PlacedImage) => {
    try {
      // Load the image to get natural dimensions
      const imgElement = new window.Image();
      imgElement.crossOrigin = "anonymous";
      imgElement.src = img.src;

      await new Promise((resolve) => {
        imgElement.onload = resolve;
      });

      // Calculate effective dimensions accounting for crops (same logic as generation handler)
      const cropWidth = img.cropWidth || 1;
      const cropHeight = img.cropHeight || 1;

      const effectiveWidth = cropWidth * imgElement.naturalWidth;
      const effectiveHeight = cropHeight * imgElement.naturalHeight;

      return {
        width: Math.round(effectiveWidth),
        height: Math.round(effectiveHeight),
        isCropped: cropWidth !== 1 || cropHeight !== 1,
      };
    } catch (error) {
      // Fallback to display dimensions if image loading fails
      return {
        width: Math.round(image.width),
        height: Math.round(image.height),
        isCropped: false,
      };
    }
  };

  const [apiDimensions, setApiDimensions] = React.useState<{
    width: number;
    height: number;
    isCropped: boolean;
  } | null>(null);

  React.useEffect(() => {
    getApiDimensions(image).then(setApiDimensions);
  }, [image.src, image.cropWidth, image.cropHeight]);

  if (!apiDimensions) return null;

  // Convert image center-bottom position to screen coordinates
  const imageCenterX = image.x + image.width / 2;
  const imageBottomY = image.y + image.height;

  const { x: screenX, y: screenY } = canvasToScreen(imageCenterX, imageBottomY, viewport);

  return (
    <div
      className="fixed pointer-events-none z-50 bg-background/90 backdrop-blur-sm border rounded-md px-2 py-1 text-xs text-foreground/80 shadow-sm hidden md:block"
      style={{
        left: screenX,
        top: screenY + 8, // 8px below the image
        transform: "translateX(-50%)", // Center horizontally under the image
      }}
    >
      <div className="flex flex-col gap-0.5">
        <div className="font-medium">
          {apiDimensions.width} × {apiDimensions.height} px
        </div>
      </div>
    </div>
  );
};
