"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils/utils";

/**
 * Button Bento (2026) — botón NATIVO, sin Ant Design.
 *
 * Reemplaza el shim anterior que renderizaba `<AntdButton>` (por eso los
 * botones salían con clases `ant-btn` y no se veían Bento). La apariencia ahora
 * la controlan tokens semánticos del proyecto (brand/elevated/hairline/ink/
 * subtle), no antd.
 *
 * API drop-in: acepta la API estilo shadcn (`variant`, `size` sm/lg/icon) y las
 * props que el código venía pasando a través del shim antd:
 *   - `type` antd (primary/text/link/dashed/default) → se mapea a `variant`
 *   - `htmlType` (button/submit/reset) → tipo HTML real del `<button>`
 *   - `size` antd (small/middle/large) → se mapea a sm/default/lg
 *   - `loading` (spinner + disabled), `icon` (nodo antes del texto),
 *     `danger` (→ destructive), `shape="circle"|"round"` (→ redondeado completo),
 *     `block` (→ ancho completo)
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium",
    "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // `bg-brand-strong` (no `bg-brand`) para que el texto blanco cumpla
        // WCAG AA (>=4.5:1) también en tema OSCURO, donde `--brand` se aclara a
        // blue-500 (#3b82f6 → 3.68:1, falla) mientras `--brand-strong` = blue-600
        // (#2563eb → 5.17:1, pasa). En claro pasa de sobra (blue-700).
        default: "bg-brand-strong text-white hover:bg-brand-strong/90",
        outline:
          "border border-hairline bg-elevated text-ink hover:border-brand/40 hover:bg-hover hover:text-brand",
        ghost: "text-ink hover:bg-hover",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-600/90 focus-visible:ring-rose-500/40",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6",
        icon: "h-10 w-10 p-0",
      },
      shape: {
        default: "",
        circle: "rounded-full",
        round: "rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default", shape: "default" },
  },
);

type ShadcnVariant = "default" | "outline" | "ghost" | "destructive" | "link";
type ShadcnSize = "default" | "sm" | "lg" | "icon";
type AntdSize = "small" | "middle" | "large";
type AntdType = "primary" | "default" | "text" | "link" | "dashed";
type HtmlType = "button" | "submit" | "reset";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ShadcnVariant;
  /** Tamaño shadcn (default/sm/lg/icon) o antd (small/middle/large) para compat. */
  size?: ShadcnSize | AntdSize;
  /** Tipo HTML (button/submit/reset) o antd (primary/text/link/dashed/default) — compat shim. */
  type?: HtmlType | AntdType;
  /** Tipo HTML real del `<button>` (compat antd `htmlType`). */
  htmlType?: HtmlType;
  /** Muestra un spinner y deshabilita (compat antd `loading`). */
  loading?: boolean;
  /** Ícono antes del texto (compat antd `icon`). */
  icon?: React.ReactNode;
  /** Estilo destructivo (compat antd `danger`). */
  danger?: boolean;
  /** Forma (compat antd): `circle`/`round` → redondeado completo. */
  shape?: "default" | "circle" | "round";
  /** Ancho completo (compat antd `block`). */
  block?: boolean;
}

const ANTD_TYPES = ["primary", "default", "text", "link", "dashed"];
const ANTD_SIZES = ["small", "middle", "large"];

function mapAntdTypeToVariant(t: AntdType): ShadcnVariant {
  switch (t) {
    case "primary":
      return "default";
    case "text":
      return "ghost";
    case "link":
      return "link";
    case "dashed":
    case "default":
    default:
      return "outline";
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      shape = "default",
      type,
      htmlType,
      loading = false,
      icon,
      danger = false,
      block = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const typeIsAntd = type !== undefined && ANTD_TYPES.includes(type);

    const resolvedVariant: ShadcnVariant = danger
      ? "destructive"
      : typeIsAntd
        ? mapAntdTypeToVariant(type as AntdType)
        : (variant ?? "default");

    const resolvedSize: ShadcnSize = ANTD_SIZES.includes(size as string)
      ? size === "small"
        ? "sm"
        : size === "large"
          ? "lg"
          : "default"
      : ((size as ShadcnSize | undefined) ?? "default");

    // Tipo HTML real: si `type` era HTML úsalo; si era antd usa `htmlType`.
    // Default "submit" cuando `type` es HTML y no se especifica, igual que el
    // shim previo y que un `<button>` nativo (comportamiento drop-in).
    const nativeType: HtmlType = typeIsAntd
      ? (htmlType ?? "button")
      : ((type as HtmlType | undefined) ?? htmlType ?? "submit");

    return (
      <button
        ref={ref}
        type={nativeType}
        disabled={disabled || loading}
        className={cn(
          buttonVariants({
            variant: resolvedVariant,
            size: resolvedSize,
            shape,
          }),
          block && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
