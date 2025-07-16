import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  LightbulbIcon,
} from "../icons";

const ICON_TYPE = {
  error: AlertCircleIcon,
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  hint: LightbulbIcon,
} as const;

const alertVariants = cva(
  "relative w-full flex flex-row items-start justify-start",
  {
    variants: {
      type: {
        error: "[&>svg]:stroke-error [&_.alert-title]:text-error",
        info: "[&>svg]:stroke-info-dark dark:[&>svg]:stroke-info [&_.alert-title]:text-info-dark dark:[&_.alert-title]:text-info",
        success:
          "[&>svg]:stroke-success-700 [&_.alert-title]:text-success-700 dark:[&_.alert-title]:text-success dark:[&>svg]:stroke-success",
        warning:
          "[&>svg]:stroke-warning [&_.alert-title]:text-amber-500 [&_.alert-title]:dark:text-warning",
        hint: "[&>svg]:stroke-warning [&_.alert-title]:text-amber-500 [&_.alert-title]:dark:text-warning",
      },
      container: {
        none: "",
        bordered:
          "rounded border border-stroke-light p-4 bg-black/[1%] dark:bg-black/5",
      },
    },
    defaultVariants: {
      type: "info",
      container: "none",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, type, container, children, ...props }, ref) => {
  const Icon = type ? ICON_TYPE[type] : InfoIcon;
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "space-x-2 text-content-base",
        "[&>svg]:icon-lg [&>svg]:text-current",
        alertVariants({ type, container }),
        className,
      )}
      {...props}
    >
      <Icon className="icon-md min-w-fit flex-none" />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "alert-title mb-2 pt-1 font-heading text-lg font-medium leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-content-light [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription, AlertTitle };
