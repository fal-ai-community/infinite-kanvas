import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface GenerationsIndicatorProps {
  className?: string;
  speed?: number;
  isAnimating?: boolean;
  activeGenerationsSize?: number;
  outputType?: "image" | "video";
  isSuccess?: boolean;
}

export function GenerationsIndicator({
  className,
  speed = 150,
  isAnimating = true,
  activeGenerationsSize,
  outputType = "image",
  isSuccess = false,
}: GenerationsIndicatorProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  // Determine the fill color based on output type
  const fillColor = outputType === "video" ? "#A855F7" : "#EC0648"; // purple for video, red for image

  const svgFrames = [
    <motion.svg
      key="frame-0"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="3"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="5" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="5"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="10" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="15" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="10"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="15"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
        fillOpacity="0.08"
      />
    </motion.svg>,

    // Frame 2
    <motion.svg
      key="frame-1"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="3"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="5" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="5"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="10" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="15" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="10"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="15"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
        fillOpacity="0.08"
      />
    </motion.svg>,

    // Frame 3
    <motion.svg
      key="frame-2"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="5" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="5"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="10" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="15" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="10"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="15"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="3" y="3" width="3" height="3" fill="#EC0648" />
      <rect x="3" y="13" width="3" height="3" fill="#EC0648" />
      <rect x="13" y="13" width="3" height="3" fill="#EC0648" />
      <rect x="13" y="3" width="3" height="3" fill="#EC0648" />
    </motion.svg>,

    // Frame 4
    <motion.svg
      key="frame-3"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="5" width="4" height="4" fill="#EC0648" />
      <rect width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="5" y="15" width="4" height="4" fill="#EC0648" />
      <rect x="10" width="4" height="4" fill="#EC0648" />
      <rect x="15" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="10" y="15" width="4" height="4" fill="#EC0648" />
      <rect
        x="15"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="3" y="3" width="3" height="3" fill="#EC0648" />
      <rect x="3" y="13" width="3" height="3" fill="#EC0648" />
      <rect x="13" y="13" width="3" height="3" fill="#EC0648" />
      <rect x="13" y="3" width="3" height="3" fill="#EC0648" />
    </motion.svg>,

    // Frame 5
    <motion.svg
      key="frame-4"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="3"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="5" width="4" height="4" fill="#EC0648" />
      <rect width="4" height="4" fill="#EC0648" />
      <rect x="5" y="15" width="4" height="4" fill="#EC0648" />
      <rect x="10" width="4" height="4" fill="#EC0648" />
      <rect x="15" width="4" height="4" fill="#EC0648" />
      <rect x="10" y="15" width="4" height="4" fill="#EC0648" />
      <rect x="15" y="15" width="4" height="4" fill="#EC0648" />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
      />
    </motion.svg>,
  ];

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % svgFrames.length);
    }, speed);

    return () => clearInterval(interval);
  }, [speed, isAnimating, svgFrames.length]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 relative p-2 pr-3 rounded-xl",
        isSuccess
          ? "bg-green-500/10 dark:bg-green-500/15 text-green-600 dark:text-green-500"
          : outputType === "video"
            ? "bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-500"
            : "bg-[#EC0648]/10 dark:bg-[#EC0648]/15 text-[#EC0648] dark:text-[#EC0648]",
      )}
    >
      {isSuccess ? (
        <>
          <svg
            width="19"
            height="19"
            viewBox="0 0 19 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 10L7 14L16 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-medium">Done</span>
        </>
      ) : (
        <>
          <AnimatePresence mode="wait">
            {svgFrames[currentFrame]}
          </AnimatePresence>
          <span className="font-medium">
            Generating {activeGenerationsSize} {outputType}
            {activeGenerationsSize && activeGenerationsSize > 1 ? "s" : ""}
          </span>
        </>
      )}
    </div>
  );
}
