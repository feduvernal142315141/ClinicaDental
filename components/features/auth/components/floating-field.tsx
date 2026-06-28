"use client";

import * as React from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/utils";

interface FloatingFieldProps
  extends Omit<React.ComponentProps<"input">, "placeholder"> {
  label: string;
  /** Mensaje de error (estado rojo). Tiene prioridad sobre `success`. */
  error?: string | null;
  /** Estado de éxito (check verde) tras validación correcta. */
  success?: boolean;
  /** Ícono prefijo opcional (line icon de lucide). */
  icon?: React.ReactNode;
}

/**
 * Campo con LABEL FLOTANTE animado + estados de validación (neutro/éxito/error)
 * y toggle de visibilidad para contraseñas. Cumple el estándar de forms 2026:
 * floating label, touch target ≥48px, aria-invalid + aria-describedby.
 */
export const FloatingField = React.forwardRef<
  HTMLInputElement,
  FloatingFieldProps
>(({ id, label, type = "text", error, success, icon, className, ...props }, ref) => {
  const [show, setShow] = React.useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="w-full">
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={inputType}
          placeholder=" "
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={cn(
            "peer h-14 w-full rounded-2xl border bg-elevated/70 pb-1.5 pt-5 text-sm text-ink outline-none transition-all duration-200",
            "placeholder:text-transparent",
            "focus:ring-2 focus:shadow-[0_12px_30px_-14px_rgb(var(--brand)/0.55)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon ? "pl-11" : "pl-4",
            isPassword || success ? "pr-11" : "pr-4",
            error
              ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
              : success
                ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20"
                : "border-hairline focus:border-brand focus:ring-brand/25",
            className,
          )}
          {...props}
        />

        <label
          htmlFor={id}
          className={cn(
            // Por defecto (con valor) → flotando arriba.
            "pointer-events-none absolute top-3 text-xs font-medium transition-all duration-150",
            icon ? "left-11" : "left-4",
            "text-subtle peer-focus:text-brand",
            // Vacío y sin foco → vuelve al centro como placeholder.
            "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal",
            // Con foco → flota de nuevo.
            "peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium",
            error && "text-rose-500 peer-focus:text-rose-500",
          )}
        >
          {label}
        </label>

        {icon ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle transition-colors peer-focus:text-brand [&>svg]:h-4.5 [&>svg]:w-4.5">
            {icon}
          </span>
        ) : null}

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {show ? (
              <EyeOff className="h-4.5 w-4.5" />
            ) : (
              <Eye className="h-4.5 w-4.5" />
            )}
          </button>
        ) : success ? (
          <Check className="absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-emerald-500" />
        ) : null}
      </div>

      {error ? (
        <p
          id={errorId}
          className="mt-1.5 flex items-center gap-1 text-xs text-rose-500"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});

FloatingField.displayName = "FloatingField";
