"use client";

import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/utils";

interface AuthCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Ícono dentro del orbe superior (default: escudo). */
  icon?: ReactNode;
  /** Texto pequeño sobre el título (p.ej. el wordmark de marca). */
  eyebrow?: ReactNode;
  children: ReactNode;
  /** Contenido secundario bajo el formulario (links, etc.). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Tarjeta de autenticación 2026: vidrio + bento (hairline, rounded-bento, blur),
 * orbe de marca con halo y entrada animada. Se usa dentro de <AuthShell>.
 */
export function AuthCard({
  title,
  description,
  icon,
  eyebrow,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <div
      className={cn(
        "animate-auth-rise w-full max-w-md rounded-bento border border-hairline bg-surface/80 p-7 shadow-xl shadow-black/5 backdrop-blur-xl sm:p-8",
        className,
      )}
    >
      <div className="mb-6 text-center">
        <div className="animate-auth-float relative mx-auto mb-4 inline-flex">
          <span className="animate-auth-pulse-ring absolute inset-0 rounded-2xl bg-brand/40" />
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            {icon ?? <ShieldCheck className="h-7 w-7" />}
          </div>
        </div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mx-auto mt-1.5 max-w-xs text-balance text-sm text-subtle">
            {description}
          </p>
        ) : null}
      </div>

      {children}

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}
