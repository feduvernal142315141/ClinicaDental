"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          className={cn(
            // Shell Bento — coherente con Input / controls/*.
            "flex min-h-[88px] w-full rounded-xl border border-hairline bg-elevated px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-500/60",
            error && "border-rose-500/60",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;
