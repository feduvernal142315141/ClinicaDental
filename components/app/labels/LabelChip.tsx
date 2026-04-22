"use client";

import React from "react";
import type { LabelSummary } from "@/lib/entity/label";

interface LabelChipProps {
  label: LabelSummary;
  size?: "xs" | "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
}

/**
 * Returns black or white text color for best contrast against the given hex background.
 */
function getContrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "#000000";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
}

const SIZE_STYLES: Record<NonNullable<LabelChipProps["size"]>, React.CSSProperties> = {
  xs: { fontSize: 10, padding: "1px 6px", borderRadius: 10, gap: 3 },
  sm: { fontSize: 11, padding: "2px 8px", borderRadius: 12, gap: 4 },
  md: { fontSize: 13, padding: "4px 10px", borderRadius: 14, gap: 5 },
};

export function LabelChip({ label, size = "sm", removable = false, onRemove }: LabelChipProps) {
  const bg = label.color ?? "#888888";
  const textColor = getContrastColor(bg);
  const sizeStyle = SIZE_STYLES[size];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: bg + "33", // ~20% opacity
        border: `1px solid ${bg}`,
        color: textColor === "#ffffff" ? bg : "#262626",
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        ...sizeStyle,
      }}
    >
      {label.icon && (
        <span style={{ marginRight: sizeStyle.gap, opacity: 0.8 }}>
          {label.icon}
        </span>
      )}
      {label.name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginLeft: sizeStyle.gap,
            lineHeight: 1,
            color: "inherit",
            opacity: 0.7,
            fontSize: "inherit",
          }}
          aria-label={`Remover ${label.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
