"use client";

import React from "react";
import * as AntdIcons from "@ant-design/icons";

interface DynamicIconProps {
  name: string;
  style?: React.CSSProperties;
}

/**
 * Renders an AntD icon dynamically from a string name.
 * Converts e.g. "alert" → "AlertOutlined", "check-circle" → "CheckCircleOutlined"
 */
export function DynamicIcon({ name, style }: DynamicIconProps) {
  const iconName =
    name
      .charAt(0)
      .toUpperCase() +
    name
      .slice(1)
      .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) +
    "Outlined";

  const IconComponent = (
    AntdIcons as unknown as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>
  )[iconName];

  if (!IconComponent) return null;
  return <IconComponent style={style} />;
}
