import React from "react";
import useImage from "use-image";
import { CropOverlay } from "./CropOverlay";
import type { PlacedImage } from "@/types/canvas";

interface CropOverlayWrapperProps {
  image: PlacedImage;
  onCropChange: (crop: {
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
  }) => void;
  onCropEnd: () => void;
}

export const CropOverlayWrapper: React.FC<CropOverlayWrapperProps> = ({
  image,
  onCropChange,
  onCropEnd,
}) => {
  const [img] = useImage(image.src, "anonymous");

  if (!img) return null;

  return (
    <CropOverlay
      image={image}
      imageElement={img}
      onCropChange={onCropChange}
      onCropEnd={onCropEnd}
    />
  );
};
