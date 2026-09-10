"use client";

import { cn } from "../utils";

import { toToothLabel } from "./tooth-notation";
import type { PalmerQuadrant, ToothNotation } from "./types";

const PALMER_BRACKET_CLASS: Record<PalmerQuadrant, string> = {
  "superior-derecho": "border-r-[1.5px] border-b-[1.5px]",
  "superior-izquierdo": "border-l-[1.5px] border-b-[1.5px]",
  "inferior-derecho": "border-r-[1.5px] border-t-[1.5px]",
  "inferior-izquierdo": "border-l-[1.5px] border-t-[1.5px]",
};

export interface ToothNotationLabelProps {
  fdi: number;
  notation: ToothNotation;
  prefix?: string;
  className?: string;
}

export function ToothNotationLabel({
  fdi,
  notation,
  prefix,
  className,
}: ToothNotationLabelProps) {
  const { digits, quadrant, plain } = toToothLabel(fdi, notation);
  const accessibleLabel = prefix ? `${prefix} ${plain}` : plain;

  return (
    <span
      role="img"
      title={`FDI ${fdi}`}
      aria-label={accessibleLabel}
      className={cn("inline-flex items-center", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "leading-none",
          quadrant && [
            "border-current px-[0.2em] py-[0.15em]",
            PALMER_BRACKET_CLASS[quadrant],
          ],
        )}
      >
        {digits}
      </span>
    </span>
  );
}
