"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SunIcon, MoonIcon, LaptopIcon } from "lucide-react";

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[116px] h-9" />;
  }

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-md">
      <Button
        variant={theme === "light" ? "secondary" : "default"}
        size="icon"
        onClick={() => setTheme("light")}
        className={`transition-all ${
          theme === "light"
            ? "bg-background shadow-sm"
            : "hover:bg-background/50"
        }`}
      >
        <SunIcon className="h-4 w-4" />
        <span className="sr-only">Light theme</span>
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "default"}
        size="icon"
        onClick={() => setTheme("dark")}
        className={`transition-all ${
          theme === "dark"
            ? "bg-background shadow-sm"
            : "hover:bg-background/50"
        }`}
      >
        <MoonIcon className="h-4 w-4" />
        <span className="sr-only">Dark theme</span>
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "default"}
        size="icon"
        onClick={() => setTheme("system")}
        className={`transition-all ${
          theme === "system"
            ? "bg-background shadow-sm"
            : "hover:bg-background/50"
        }`}
      >
        <LaptopIcon className="h-4 w-4" />
        <span className="sr-only">System theme</span>
      </Button>
    </div>
  );
}
