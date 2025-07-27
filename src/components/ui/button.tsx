import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl",
    "outline-none",
    "font-heading font-medium transition-all",
    "disabled:pointer-events-none disabled:opacity-50",
    // Svg icons style
    "gap-1.5 [&>svg]:stroke-[1.5] [&>svg]:h-6 [&>svg]:w-6",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-transparent text-content-strong border-stroke-strong",
          "hover:text-content-stronger hover:border-stroke-stronger",
          "data-[state=open]:bg-surface-alpha",
          "[&>svg]:text-content-lighter",
        ],
        primary: [
          "bg-primary text-primary-foreground hover:bg-primary-dark",
          "[&>svg]:text-primary-300",
        ],
        secondary: [
          "bg-secondary/40 text-secondary-foreground hover:bg-secondary/80",
        ],
        ghost: [
          "bg-transparent text-secondary-foreground hover:bg-secondary/40",
        ],
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-sm [&>svg]:h-5 [&>svg]:w-5",
        lg: "h-11 px-6",
        xl: "h-12 px-7 py-2 text-lg",
        xs: "h-8 px-2.5 text-sm [&>svg]:h-4 [&>svg]:w-4",
        icon: "h-10 w-10 [&>svg]:w-5 [&>svg]:h-5 [&>svg]:stroke-current disabled:opacity-100",
        "icon-sm": "h-9 w-9 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-current",
        "icon-xs": "h-8 w-8 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  customVariant?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, customVariant, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          customVariant,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
