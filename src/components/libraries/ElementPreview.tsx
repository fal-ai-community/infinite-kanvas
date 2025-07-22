"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LibraryElement } from "@/types/libraries";

interface ElementPreviewProps {
  element: LibraryElement;
}

export function ElementPreview({ element }: ElementPreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <div
        className="border border-border rounded-md overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => setIsPreviewOpen(true)}
      >
        <div className="aspect-square relative bg-muted/50">
          <Image
            src={element.thumbnailUrl}
            alt={element.name}
            fill
            loading="lazy"
            className="object-cover transition-opacity duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdQIQX8Fo/wAAAABJRU5ErkJggg=="
          />
        </div>
        <div className="p-2">
          <p className="text-sm font-medium truncate">{element.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {element.type}
          </p>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">{element.name} Preview</DialogTitle>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{element.name}</h3>
            <div className="aspect-square relative rounded-md overflow-hidden">
              <Image
                src={element.thumbnailUrl}
                alt={element.name}
                fill
                className="object-contain"
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground capitalize">
                {element.type}
              </p>
              {element.metadata &&
                element.metadata.tags &&
                element.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {element.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted px-2 py-0.5 rounded-full text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
