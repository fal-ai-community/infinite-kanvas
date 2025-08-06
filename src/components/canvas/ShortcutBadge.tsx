import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { keySymbolMap } from "@/utils/constants";

// ShortcutBadge styling variants
export const shortcutBadgeVariants = cva(
  [
    "flex items-center justify-center tracking-tighter",
    "rounded-xl border px-1 font-mono",
  ],
  {
    variants: {
      variant: {
        default: "border-border",
        alpha: "bg-white/10 border-white/10",
      },
      size: {
        xs: "h-6 min-w-6 text-xs",
        sm: "h-7 min-w-7 text-sm",
        md: "h-8 min-w-8 text-md",
        lg: "h-9 min-w-9 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

type BaseShortcutBadgeProps = {
  shortcut: string;
};

interface ShortcutBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    BaseShortcutBadgeProps,
    VariantProps<typeof shortcutBadgeVariants> {}

export function ShortcutBadge({
  className,
  variant,
  size,
  shortcut,
}: ShortcutBadgeProps) {
  const keys = shortcut
    .split("+")
    .map((key) => keySymbolMap[key.trim()] ?? key.trim());
  return (
    <span className="flex flex-row space-x-0.5">
      {keys.map((key, index) => (
        <kbd
          key={index}
          className={shortcutBadgeVariants({ variant, size, className })}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
