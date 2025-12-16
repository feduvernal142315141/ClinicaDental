"use client";

import { Typography } from "antd";
import { TextProps as AntTextProps } from "antd/es/typography/Text";

const { Text: AntText } = Typography;

type TextVariant = "default" | "secondary" | "success" | "warning" | "danger";
type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";

interface TextProps extends Omit<AntTextProps, "type"> {
  variant?: TextVariant;
  size?: TextSize;
  weight?: "normal" | "medium" | "semibold" | "bold";
  children: React.ReactNode;
  className?: string;
}

const sizeStyles: Record<TextSize, React.CSSProperties> = {
  xs: { fontSize: 12 },
  sm: { fontSize: 14 },
  base: { fontSize: 16 },
  lg: { fontSize: 18 },
  xl: { fontSize: 20 },
  "2xl": { fontSize: 24 },
};

const weightStyles: Record<string, React.CSSProperties> = {
  normal: { fontWeight: 400 },
  medium: { fontWeight: 500 },
  semibold: { fontWeight: 600 },
  bold: { fontWeight: 700 },
};

const variantMap: Record<TextVariant, AntTextProps["type"] | undefined> = {
  default: undefined,
  secondary: "secondary",
  success: "success",
  warning: "warning",
  danger: "danger",
};

/**
 * Ant Design Text component wrapper
 * Provides consistent typography with size, weight, and variant options
 * Automatically adapts to light/dark theme
 */
export function Text({
  variant = "default",
  size = "base",
  weight = "normal",
  children,
  className,
  style,
  ...props
}: TextProps) {
  return (
    <AntText
      type={variantMap[variant]}
      className={className}
      style={{
        ...sizeStyles[size],
        ...weightStyles[weight],
        ...style,
      }}
      {...props}
    >
      {children}
    </AntText>
  );
}
