"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Plus } from "lucide-react";
import { Library, LibraryElement } from "@/types/libraries";
import { formatDistanceToNow } from "date-fns";
import { ElementPreview } from "./ElementPreview";

interface LibraryDetailProps {
  library: Library;
  onBack: () => void;
  onAddToCanvas: (library: Library) => void;
}

export function LibraryDetail({
  library,
  onBack,
  onAddToCanvas,
}: LibraryDetailProps) {
  // Sample library elements if none provided
  const elements =
    library.elements ||
    ([
      {
        id: "element-1",
        type: "component",
        name: "Database",
        thumbnailUrl: "/images/styles/abstract.jpg",
        data: {
          /* element data */
        },
      },
      {
        id: "element-2",
        type: "component",
        name: "Server",
        thumbnailUrl: "/images/styles/3d.jpg",
        data: {
          /* element data */
        },
      },
      {
        id: "element-3",
        type: "component",
        name: "Client",
        thumbnailUrl: "/images/styles/minimalist.jpg",
        data: {
          /* element data */
        },
      },
    ] as LibraryElement[]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1 h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xs">Back to Libraries</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onAddToCanvas(library)}
          className="flex items-center gap-1 h-8 px-3"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">Add to Canvas</span>
        </Button>
      </div>

      {/* Library details */}
      <div className="bg-muted/30 rounded-lg p-6 mb-8 border border-border">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Thumbnail */}
          <div className="w-full md:w-1/3 aspect-video relative rounded-md overflow-hidden">
            <Image
              src={library.thumbnailUrl}
              alt={library.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{library.title}</h2>
            <p className="text-muted-foreground mb-4">{library.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Author</p>
                <p className="font-medium">{library.author}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Downloads</p>
                <p className="font-medium">
                  {library.downloadCount.toLocaleString()}
                </p>
              </div>
              {library.createdAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {formatDistanceToNow(library.createdAt, {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}
              {library.updatedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="font-medium">
                    {formatDistanceToNow(library.updatedAt, {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}
            </div>

            {library.tags && library.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {library.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted px-2 py-1 rounded-full text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Library elements */}
      <h3 className="text-lg font-medium mb-4">Library Contents</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {elements.map((element) => (
          <ElementPreview key={element.id} element={element} />
        ))}
      </div>
    </div>
  );
}
