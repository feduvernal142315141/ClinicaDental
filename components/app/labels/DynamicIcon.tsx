"use client";

import React from "react";
import * as LucideIcons from "lucide-react";

interface DynamicIconProps {
  name: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

// Convierte "alert-circle" → "AlertCircle", "star" → "Star"
function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function DynamicIcon({ name, size = 14, style, className }: DynamicIconProps) {
  const iconName = toPascalCase(name);
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{
    size?: number;
    style?: React.CSSProperties;
    className?: string;
  }>>)[iconName];

  if (!IconComponent) return null;
  return <IconComponent size={size} style={style} className={className} />;
}
