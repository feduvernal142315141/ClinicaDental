"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Shell Bento — coherente con Input/Switch (border-hairline + accent brand).
      "group peer h-4 w-4 shrink-0 rounded-[5px] border border-hairline bg-elevated text-white transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
      "data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      {/* Marca según el estado: ✓ para checked, – para indeterminate. */}
      <Check className="hidden h-3.5 w-3.5 group-data-[state=checked]:block" />
      <Minus className="hidden h-3.5 w-3.5 group-data-[state=indeterminate]:block" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
