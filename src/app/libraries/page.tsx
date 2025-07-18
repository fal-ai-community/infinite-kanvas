"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LibraryCard } from "@/components/libraries/LibraryCard";
import { Input } from "@/components/ui/input";

import { Library } from "@/types/libraries";
import { useLibrariesStore } from "@/lib/libraries-state";
import { canvasStorage } from "@/lib/storage";
import { LibraryDetail } from "@/components/libraries/LibraryDetail";
import { VirtualizedGrid } from "@/components/libraries/VirtualizedGrid";

// Sample libraries data - in a real implementation, this would come from an API or database
const sampleLibraries: Library[] = [
  {
    id: "basic-shapes",
    title: "Basic Shapes",
    description:
      "Collection of fundamental geometric shapes for diagrams, wireframes, and visual designs",
    thumbnailUrl: "/images/styles/abstract.jpg",
    author: "Design Team",
    downloadCount: 325478,
    createdAt: new Date("2023-05-15"),
    updatedAt: new Date("2024-02-20"),
    tags: ["shapes", "geometry", "basics", "design"],
    elements: [
      {
        id: "shape-rectangle",
        type: "shape",
        name: "Rectangle",
        thumbnailUrl: "/images/styles/minimalist.jpg",
        data: { type: "rectangle", width: 100, height: 60, fill: "#4287f5" },
        metadata: {
          width: 100,
          height: 60,
          tags: ["rectangle", "basic", "shape"],
        },
      },
      {
        id: "shape-circle",
        type: "shape",
        name: "Circle",
        thumbnailUrl: "/images/styles/3d.jpg",
        data: { type: "circle", radius: 50, fill: "#42f5a7" },
        metadata: {
          width: 100,
          height: 100,
          tags: ["circle", "basic", "shape"],
        },
      },
      {
        id: "shape-triangle",
        type: "shape",
        name: "Triangle",
        thumbnailUrl: "/images/styles/abstract.jpg",
        data: {
          type: "triangle",
          points: [0, 0, 100, 0, 50, 87],
          fill: "#f542b6",
        },
        metadata: {
          width: 100,
          height: 87,
          tags: ["triangle", "basic", "shape"],
        },
      },
      {
        id: "shape-hexagon",
        type: "shape",
        name: "Hexagon",
        thumbnailUrl: "/images/styles/lowpoly.jpg",
        data: { type: "polygon", sides: 6, radius: 50, fill: "#f5d442" },
        metadata: {
          width: 100,
          height: 100,
          tags: ["hexagon", "polygon", "shape"],
        },
      },
      {
        id: "shape-star",
        type: "shape",
        name: "Star",
        thumbnailUrl: "/images/styles/glassprism.jpg",
        data: {
          type: "star",
          points: 5,
          innerRadius: 25,
          outerRadius: 50,
          fill: "#f54242",
        },
        metadata: {
          width: 100,
          height: 100,
          tags: ["star", "shape", "decoration"],
        },
      },
      {
        id: "shape-arrow",
        type: "shape",
        name: "Arrow",
        thumbnailUrl: "/images/styles/charcoal.jpg",
        data: {
          type: "arrow",
          points: [0, 20, 80, 20, 80, 0, 100, 30, 80, 60, 80, 40, 0, 40],
          fill: "#424ef5",
        },
        metadata: {
          width: 100,
          height: 60,
          tags: ["arrow", "direction", "flow"],
        },
      },
    ],
  },
  {
    id: "software-architecture",
    title: "Software Architecture",
    description:
      "Collection of software architecture components: microservice, database, cache, event bus or pipeline, documents or code, browser, and mobile device",
    thumbnailUrl: "/images/styles/abstract.jpg",
    author: "Youri Tjang",
    downloadCount: 201634,
    createdAt: new Date("2023-08-10"),
    updatedAt: new Date("2024-03-15"),
    tags: ["software", "architecture", "diagrams", "systems"],
    elements: [
      {
        id: "arch-database",
        type: "component",
        name: "Database",
        thumbnailUrl: "/images/styles/3d.jpg",
        data: { type: "database", width: 80, height: 100 },
        metadata: {
          width: 80,
          height: 100,
          tags: ["database", "storage", "architecture"],
        },
      },
      {
        id: "arch-server",
        type: "component",
        name: "Server",
        thumbnailUrl: "/images/styles/minimalist.jpg",
        data: { type: "server", width: 100, height: 120 },
        metadata: {
          width: 100,
          height: 120,
          tags: ["server", "compute", "architecture"],
        },
      },
      {
        id: "arch-microservice",
        type: "component",
        name: "Microservice",
        thumbnailUrl: "/images/styles/glassprism.jpg",
        data: { type: "microservice", width: 120, height: 80 },
        metadata: {
          width: 120,
          height: 80,
          tags: ["microservice", "service", "architecture"],
        },
      },
    ],
  },
  {
    id: "system-design",
    title: "System Design Components",
    description:
      "Components useful in interviews and elsewhere to build high-level system diagrams",
    thumbnailUrl: "/images/styles/3d.jpg",
    author: "Rohan Pithadiya",
    downloadCount: 86756,
    createdAt: new Date("2023-06-22"),
    tags: ["system design", "architecture", "interviews", "diagrams"],
  },
  {
    id: "ui-components",
    title: "UI Components",
    description:
      "Common UI elements for wireframing and prototyping web and mobile interfaces",
    thumbnailUrl: "/images/styles/minimalist.jpg",
    author: "Design Team",
    downloadCount: 54321,
    createdAt: new Date("2023-09-05"),
    tags: ["ui", "wireframe", "prototype", "design"],
  },
  {
    id: "data-visualization",
    title: "Data Visualization",
    description:
      "Charts, graphs, and data visualization components for presenting information clearly",
    thumbnailUrl: "/images/styles/glassprism.jpg",
    author: "Data Team",
    downloadCount: 32145,
    createdAt: new Date("2023-11-18"),
    tags: ["data", "charts", "graphs", "visualization"],
  },
  {
    id: "flowcharts",
    title: "Flowcharts & Diagrams",
    description:
      "Shapes and connectors for creating flowcharts, process diagrams, and decision trees",
    thumbnailUrl: "/images/styles/charcoal.jpg",
    author: "Process Team",
    downloadCount: 28976,
    createdAt: new Date("2024-01-07"),
    tags: ["flowchart", "process", "diagram", "decision tree"],
  },
  {
    id: "wireframes",
    title: "Wireframe Kit",
    description:
      "Low-fidelity wireframing components for quick sketching of interface ideas",
    thumbnailUrl: "/images/styles/pencil_drawing.jpg",
    author: "UX Team",
    downloadCount: 19854,
    createdAt: new Date("2024-02-14"),
    tags: ["wireframe", "sketch", "ui", "ux"],
  },
  {
    id: "templates",
    title: "Design Templates",
    description:
      "Ready-to-use templates for common design patterns and layouts",
    thumbnailUrl: "/images/styles/watercolor.jpg",
    author: "Template Team",
    downloadCount: 142567,
    createdAt: new Date("2023-10-05"),
    updatedAt: new Date("2024-04-12"),
    tags: ["templates", "layouts", "design", "patterns"],
    elements: [
      {
        id: "template-dashboard",
        type: "template",
        name: "Dashboard Layout",
        thumbnailUrl: "/images/styles/minimalist.jpg",
        data: { type: "dashboard", width: 800, height: 600 },
        metadata: {
          width: 800,
          height: 600,
          tags: ["dashboard", "analytics", "admin"],
        },
      },
      {
        id: "template-landing",
        type: "template",
        name: "Landing Page",
        thumbnailUrl: "/images/styles/abstract.jpg",
        data: { type: "landing", width: 1200, height: 800 },
        metadata: {
          width: 1200,
          height: 800,
          tags: ["landing", "marketing", "hero"],
        },
      },
      {
        id: "template-blog",
        type: "template",
        name: "Blog Layout",
        thumbnailUrl: "/images/styles/watercolor.jpg",
        data: { type: "blog", width: 800, height: 1200 },
        metadata: {
          width: 800,
          height: 1200,
          tags: ["blog", "article", "content"],
        },
      },
      {
        id: "template-profile",
        type: "template",
        name: "User Profile",
        thumbnailUrl: "/images/styles/3d.jpg",
        data: { type: "profile", width: 600, height: 800 },
        metadata: {
          width: 600,
          height: 800,
          tags: ["profile", "user", "account"],
        },
      },
      {
        id: "template-checkout",
        type: "template",
        name: "Checkout Flow",
        thumbnailUrl: "/images/styles/glassprism.jpg",
        data: { type: "checkout", width: 700, height: 900 },
        metadata: {
          width: 700,
          height: 900,
          tags: ["checkout", "ecommerce", "payment"],
        },
      },
    ],
  },
];

export default function LibrariesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");

  // Get libraries state and actions
  const {
    libraries,
    filteredLibraries,
    isLoading,
    error,
    setLibraries,
    setSearchTerm,
    selectedLibraryId,
    selectLibrary,
  } = useLibrariesStore();

  // Check if canvas state is preserved
  useEffect(() => {
    const navigationState = canvasStorage.getNavigationState();
    if (navigationState && navigationState.destination === "/libraries") {
      toast({
        title: "Canvas state preserved",
        description: "Your canvas will be restored when you return",
      });
    }
  }, [toast]);

  // Initialize libraries data
  useEffect(() => {
    // In a real implementation, this would fetch from an API
    setLibraries(sampleLibraries);
  }, [setLibraries]);

  // Debounced search function
  const debouncedSearch = useCallback(
    (function () {
      let timeout: NodeJS.Timeout | null = null;
      return (value: string) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          setSearchTerm(value);
        }, 300); // 300ms debounce delay
      };
    })(),
    [setSearchTerm],
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleBackToCanvas = () => {
    // Check if there are any pending operations
    const hasPendingOperations = isLoading;

    if (hasPendingOperations) {
      // Ask for confirmation before navigating
      const confirmed = window.confirm(
        "There are pending operations. Are you sure you want to navigate away?",
      );

      if (!confirmed) {
        return;
      }
    }

    // Clear the navigation state
    canvasStorage.clearNavigationState();
    router.push("/");
  };

  // Get the selected library
  const selectedLibrary = selectedLibraryId
    ? libraries.find((lib) => lib.id === selectedLibraryId)
    : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="transition-all duration-200 ease-in-out">
        {selectedLibrary ? (
          // Show library detail view when a library is selected
          <div className="animate-in fade-in slide-in-from-right duration-200">
            <LibraryDetail
              library={selectedLibrary}
              onBack={() => selectLibrary(null)}
              onAddToCanvas={(library) => {
                // Store the selected library in localStorage to be used when returning to canvas
                localStorage.setItem(
                  "selected-library",
                  JSON.stringify({
                    id: library.id,
                    title: library.title,
                    elements: library.elements || [],
                  }),
                );

                toast({
                  title: `Added ${library.title} to canvas`,
                  description:
                    "Library elements are now available in your canvas",
                });

                handleBackToCanvas();
              }}
            />
          </div>
        ) : (
          // Show libraries list view
          <div className="animate-in fade-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-8">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBackToCanvas}
                className="flex items-center gap-1 h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Back to Canvas</span>
              </Button>
              <h1 className="text-2xl font-bold">Inspiration Libraries</h1>
              <div className="w-24"></div> {/* Spacer for centering */}
            </div>

            {/* Search input */}
            <div className="relative max-w-md mx-auto mb-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search libraries..."
                value={searchInput}
                onChange={handleSearchChange}
                className="pl-10 pr-10 h-10"
                aria-label="Search libraries"
                id="library-search"
              />
              {searchInput && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                  onClick={() => {
                    setSearchInput("");
                    setSearchTerm("");
                  }}
                  aria-label="Clear search"
                >
                  <ChevronLeft className="h-3 w-3 rotate-45 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Libraries grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
              {isLoading ? (
                <div className="col-span-full flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-lg">Loading libraries...</span>
                </div>
              ) : error ? (
                <div className="col-span-full text-center py-12">
                  <div className="bg-destructive/10 rounded-lg p-8 max-w-md mx-auto border border-destructive/20">
                    <div className="text-destructive mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto mb-2"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <h3 className="text-lg font-medium">
                        Failed to load libraries
                      </h3>
                    </div>
                    <p className="text-destructive mb-4">{error}</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      There was a problem loading the libraries. This could be
                      due to a network issue or a server problem. Please try
                      again.
                    </p>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setLibraries(sampleLibraries);
                          toast({
                            title: "Retrying...",
                            description: "Attempting to load libraries again",
                          });
                        }}
                      >
                        Retry
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleBackToCanvas}
                        className="mt-2"
                      >
                        Return to Canvas
                      </Button>
                    </div>
                  </div>
                </div>
              ) : filteredLibraries.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="bg-muted/50 rounded-lg p-8 max-w-md mx-auto border border-border">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      No libraries found matching "{searchInput}"
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Try adjusting your search term or check for typos. You can
                      also browse all available libraries by clearing your
                      search.
                    </p>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearchInput("");
                          setSearchTerm("");
                        }}
                      >
                        Clear Search
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Tip: Search by title, description, or author name
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <VirtualizedGrid
                  items={filteredLibraries}
                  className="col-span-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  renderItem={(library) => (
                    <LibraryCard
                      key={library.id}
                      id={library.id}
                      title={library.title}
                      description={library.description}
                      thumbnailUrl={library.thumbnailUrl}
                      author={library.author}
                      downloadCount={library.downloadCount}
                      isSelected={selectedLibraryId === library.id}
                      highlightTerm={searchInput}
                      onClick={() => {
                        selectLibrary(library.id);
                        toast({
                          title: `Selected ${library.title}`,
                          description: "Library detail view would open here",
                        });
                      }}
                    />
                  )}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
