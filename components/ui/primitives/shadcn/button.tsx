"use client";

import * as React from "react";
import { Button as AntdButton } from "antd";
import type { ButtonProps as AntdButtonProps } from "antd";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        // La apariencia la controla Ant Design; estas clases solo aportan layout.
        default: "",
        outline: "",
        ghost: "",
        destructive: "",
        link: "",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ShadcnVariant = "default" | "outline" | "ghost" | "destructive" | "link";
type ShadcnSize = "default" | "sm" | "lg" | "icon";

type HtmlButtonType = React.ButtonHTMLAttributes<HTMLButtonElement>["type"];

export interface ButtonProps
  extends Omit<AntdButtonProps, "type" | "size" | "variant" | "color"> {
  /** Variante estilo shadcn (se mapea a `type` de AntD) */
  variant?: ShadcnVariant;

  /** Tamaño estilo shadcn (default/sm/lg/icon) o AntD (small/middle/large). */
  size?: ShadcnSize | AntdButtonProps["size"];

  /**
   * Compatible con ambos mundos:
   * - HTML: "submit" | "button" | "reset" (si no se pasa, se asume "submit" como en <button>)
   * - AntD: "primary" | "default" | "text" | "link" | ...
   */
  type?: HtmlButtonType | AntdButtonProps["type"];
}

const Button = React.forwardRef<HTMLElement, ButtonProps>(
  ({ className, variant, size, type, htmlType, ...props }, ref) => {
    const shadcnVariant: ShadcnVariant = (variant ??
      "default") as ShadcnVariant;

    const isHtmlType =
      type === undefined ||
      type === "button" ||
      type === "submit" ||
      type === "reset";

    const antdTypeFromProp = !isHtmlType
      ? (type as AntdButtonProps["type"])
      : undefined;
    // Honra `htmlType` cuando `type` no es un tipo HTML explícito. Antes, pasar
    // solo `htmlType="button"` se resolvía a "submit" (ignorando htmlType) y
    // hacía que botones secundarios (Cancelar) enviaran el formulario.
    const htmlTypeFinal: AntdButtonProps["htmlType"] = isHtmlType
      ? (type as HtmlButtonType | undefined) ?? htmlType ?? "submit"
      : htmlType ?? "button";

    const sizeFromProp = size;
    const isAntdSize =
      sizeFromProp === "small" ||
      sizeFromProp === "middle" ||
      sizeFromProp === "large";

    const antdSize: AntdButtonProps["size"] = isAntdSize
      ? (sizeFromProp as AntdButtonProps["size"])
      : sizeFromProp === "sm"
      ? "small"
      : sizeFromProp === "lg"
      ? "large"
      : "middle";

    const shadcnSize: ShadcnSize = isAntdSize
      ? sizeFromProp === "small"
        ? "sm"
        : sizeFromProp === "large"
        ? "lg"
        : "default"
      : ((sizeFromProp ?? "default") as ShadcnSize);

    const mappedTypeFromVariant: AntdButtonProps["type"] =
      shadcnVariant === "default"
        ? "primary"
        : shadcnVariant === "destructive"
        ? "primary"
        : shadcnVariant === "outline"
        ? "default"
        : shadcnVariant === "link"
        ? "link"
        : "text";

    const antdTypeFinal = antdTypeFromProp ?? mappedTypeFromVariant;
    const shape: AntdButtonProps["shape"] =
      shadcnSize === "icon" ? "circle" : undefined;

    return (
      <AntdButton
        ref={ref as unknown}
        type={antdTypeFinal}
        size={antdSize}
        htmlType={htmlTypeFinal}
        shape={shape}
        danger={props.danger ?? shadcnVariant === "destructive"}
        className={cn(
          buttonVariants({ variant: shadcnVariant, size: shadcnSize }),
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
