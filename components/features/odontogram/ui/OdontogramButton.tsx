"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/odontogram/utils";

export type OdontogramButtonVariant =
  | "primary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";

export type OdontogramButtonSize = "sm" | "md";

export interface OdontogramButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OdontogramButtonVariant;
  size?: OdontogramButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<OdontogramButtonVariant, string> = {
  // `bg-brand-strong` (no `bg-brand`) para que el texto blanco cumpla WCAG AA
  // (>=4.5:1) también en tema OSCURO, donde `--brand` se aclara a blue-500
  // (3.68:1, falla) mientras `--brand-strong` = blue-600 (5.17:1, pasa). Es la
  // misma receta del botón canónico del proyecto (`components/ui/.../button.tsx`).
  primary: "bg-brand-strong text-white hover:bg-brand-strong/90",
  outline: "border border-hairline bg-surface hover:bg-hover text-ink",
  ghost: "hover:bg-hover text-ink",
  destructive: "bg-rose-600 text-white hover:bg-rose-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};

const SIZE_CLASSES: Record<OdontogramButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

/**
 * Botón Bento puro del módulo de odontograma (sin AntD ni compat).
 * `type` es "button" por defecto para no disparar submits accidentales.
 */
export const OdontogramButton = forwardRef<
  HTMLButtonElement,
  OdontogramButtonProps
>(function OdontogramButton(
  {
    variant = "primary",
    size = "md",
    icon,
    loading = false,
    disabled,
    type = "button",
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});
