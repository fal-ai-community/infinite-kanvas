"use client";

import React from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Library } from "@/types/libraries";
import { HighlightedText } from "./HighlightedText";

interface LibraryCardProps extends Partial<Library> {
  onClick?: () => void;
  isSelected?: boolean;
  highlightTerm?: string;
}

export function LibraryCard({
  id,
  title,
  description,
  thumbnailUrl,
  author,
  downloadCount,
  onClick,
  isSelected = false,
  highlightTerm = "",
}: LibraryCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border border-border transition-all duration-200 cursor-pointer",
        "hover:border-primary/50 hover:shadow-md",
        isSelected && "border-primary ring-1 ring-primary",
      )}
      onClick={onClick}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted/50">
        <Image
          src={thumbnailUrl || "/placeholder-image.jpg"}
          alt={title || "Library thumbnail"}
          fill
          loading="lazy"
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdQIQX8Fo/wAAAABJRU5ErkJggg=="
        />
      </div>
      <div className="p-4">
        <h3 className="font-medium text-base mb-1 line-clamp-1">
          <HighlightedText
            text={title || "Untitled Library"}
            highlight={highlightTerm}
          />
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          <HighlightedText
            text={description || "No description available"}
            highlight={highlightTerm}
          />
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <HighlightedText
              text={author || "Unknown Author"}
              highlight={highlightTerm}
            />
          </span>
          <span>{downloadCount || 0} downloads</span>
        </div>
      </div>
    </Card>
  );
}
