"use client";

import React, { useState } from "react";
import type { LabelSummary } from "@/lib/entity/label";
import { DynamicIcon } from "./DynamicIcon";

interface LabelChipProps {
  label: LabelSummary;
  size?: "xs" | "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
}

const ICON_SIZE: Record<NonNullable<LabelChipProps["size"]>, number> = {
  xs: 11,
  sm: 13,
  md: 15,
};

const SIZE_STYLES: Record<NonNullable<LabelChipProps["size"]>, React.CSSProperties> = {
  xs: { fontSize: 11, padding: "2px 8px",  borderRadius: 20, gap: 4 },
  sm: { fontSize: 12, padding: "3px 10px", borderRadius: 20, gap: 5 },
  md: { fontSize: 14, padding: "5px 12px", borderRadius: 20, gap: 6 },
};

export function LabelChip({ label, size = "sm", removable = false, onRemove }: LabelChipProps) {
  const [hovered, setHovered] = useState(false);
  const color = label.color ?? "#3B82F6";
  const sizeStyle = SIZE_STYLES[size];

  // Background: always visible, slightly deeper on hover
  const bgOpacity = hovered ? "40" : "1a"; // ~25% vs ~10%
  const bg = color + bgOpacity;
  const borderColor = hovered ? color + "cc" : color + "88";

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: bg,
        border: `1.5px solid ${borderColor}`,
        borderRadius: sizeStyle.borderRadius,
        color: color,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "background-color 0.15s, border-color 0.15s",
        boxShadow: `0 0 0 1px ${color}22`,
        cursor: "default",
        ...sizeStyle,
      }}
    >
      {label.icon && (
        <span
          title={label.icon.replace(/-/g, " ")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginRight: sizeStyle.gap,
            opacity: 0.85,
          }}
        >
          <DynamicIcon name={label.icon} size={ICON_SIZE[size]} />
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
            opacity: 0.6,
            fontSize: "inherit",
            display: "inline-flex",
            alignItems: "center",
          }}
          aria-label={`Remover ${label.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
