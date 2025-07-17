import React, { useState } from "react";
import { Hand, Search, Focus, RotateCcw, Keyboard, X } from "lucide-react";
import { checkOS } from "@/utils/os-utils";
import { cn } from "@/lib/utils";

export const ShortcutsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMac = checkOS("Mac");
  const modKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    {
      icon: <Hand className="h-3 w-3" />,
      keys: ["Space", "Drag"],
      description: "Pan",
    },
    {
      icon: <Search className="h-3 w-3" />,
      keys: ["Space", "Scroll"],
      description: "Zoom",
    },
    {
      icon: <Focus className="h-3 w-3" />,
      keys: [modKey, "F"],
      description: "Focus",
    },
    {
      icon: <RotateCcw className="h-3 w-3" />,
      keys: [modKey, "R"],
      description: "Reset Image",
    },
  ];

  return (
    <div className="absolute top-48 right-2 md:right-4 z-20">
      {/* Toggle button */}
      <div className="bg-background/98 backdrop-blur-md border border-border/60 rounded shadow-lg overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs text-foreground/90 hover:text-foreground transition-all w-full",
            "hover:bg-background/80 backdrop-blur-sm",
            isOpen && "border-b border-border/60",
          )}
          title={isOpen ? "Hide keyboard shortcuts" : "Show keyboard shortcuts"}
        >
          <Keyboard className="h-4 w-4" />
          <span>Shortcuts</span>
          <div className="ml-auto">
            {isOpen ? (
              <X className="h-3 w-3" />
            ) : (
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>
        </button>

        {/* Expandable content with smooth animation */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isOpen ? "max-h-96" : "max-h-0",
          )}
        >
          <div className="p-3 space-y-1.5 bg-background/95 backdrop-blur-sm">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs text-foreground/80"
              >
                {shortcut.icon}
                <div className="flex items-center gap-0.5">
                  {shortcut.keys.map((key, i) => (
                    <React.Fragment key={i}>
                      <kbd className="px-1 py-0.5 text-[10px] font-mono bg-background/90 text-foreground/90 rounded border border-border/60 shadow-sm">
                        {key}
                      </kbd>
                      {i < shortcut.keys.length - 1 && (
                        <span className="text-[10px] text-foreground/60">
                          +
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-[10px] text-foreground/75 ml-auto font-medium">
                  {shortcut.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
