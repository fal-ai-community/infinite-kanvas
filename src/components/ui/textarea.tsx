import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          [
            "flex min-h-[80px] w-full rounded border outline-none border-stroke-base bg-transparent px-3 py-2",
            "text-base md:text-sm text-content placeholder:text-content-lighter",
            "disabled:cursor-not-allowed disabled:opacity-50",
          ],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
