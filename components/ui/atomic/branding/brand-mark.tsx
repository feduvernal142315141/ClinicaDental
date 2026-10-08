"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/utils";

/**
 * Marca de ClinicFlow360 (diente con destello), tomada del kit `clinicflow360-brand`.
 * Va en línea para heredar tamaño por `className` y no depender de una petición extra.
 *
 * - `tile`: icono de la app, símbolo blanco sobre el degradado de marca. Es el sustituto
 *   del logo cuando la clínica no ha subido el suyo.
 * - `color` / `on-dark`: solo el símbolo, para fondos claros u oscuros.
 * - `mono`: solo el símbolo en `currentColor`.
 */
type BrandMarkVariant = "tile" | "color" | "on-dark" | "mono";

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  /** Solo `tile`: redondea las esquinas. Desactívalo si el contenedor ya recorta. */
  rounded?: boolean;
  className?: string;
  /** Sin título el SVG es decorativo (el nombre suele ir al lado). */
  title?: string;
}

const TOOTH =
  "M32 20C28 15 17 15 17 26C17 34 21 38 22 46C22.6 50.5 27 51 28 46C29 41 30 38 32 38C34 38 35 41 36 46C37 51 41.4 50.5 42 46C43 38 47 34 47 26C47 15 36 15 32 20Z";
const SPARK =
  "M47 6.5C47.9 12.5 50.5 15.1 56.5 16C50.5 16.9 47.9 19.5 47 25.5C46.1 19.5 43.5 16.9 37.5 16C43.5 15.1 46.1 12.5 47 6.5Z";

export function BrandMark({ variant = "tile", rounded = true, className, title }: BrandMarkProps) {
  // Varios logos pueden convivir en la página: los ids del degradado y la máscara deben ser únicos.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradientId = `cf360-g-${uid}`;
  const maskId = `cf360-m-${uid}`;

  const stroke =
    variant === "tile" ? "#ffffff" : variant === "mono" ? "currentColor" : `url(#${gradientId})`;
  const spark =
    variant === "tile"
      ? "#ffffff"
      : variant === "mono"
        ? "currentColor"
        : variant === "on-dark"
          ? "#5eead4"
          : "#14b8a6";

  const symbol = (
    <>
      <g mask={`url(#${maskId})`}>
        <path
          transform="translate(-3 4)"
          d={TOOTH}
          fill="none"
          stroke={stroke}
          strokeWidth={5.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <path d={SPARK} fill={spark} />
    </>
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        {variant === "on-dark" ? (
          <linearGradient id={gradientId} x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#32b4fe" />
            <stop offset="1" stopColor="#b8e3ff" />
          </linearGradient>
        ) : (
          <linearGradient
            id={gradientId}
            x1={variant === "tile" ? 0 : 8}
            y1={variant === "tile" ? 64 : 56}
            x2={variant === "tile" ? 64 : 56}
            y2={variant === "tile" ? 0 : 8}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#025f9a" />
            <stop offset=".55" stopColor="#037ecc" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        )}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <circle cx="47" cy="16" r="11.5" fill="#000" />
        </mask>
      </defs>
      {variant === "tile" ? (
        <>
          <rect width="64" height="64" rx={rounded ? 15 : 0} fill={`url(#${gradientId})`} />
          <g transform="translate(32 32) scale(.74) translate(-33.5 -31.8)">{symbol}</g>
        </>
      ) : (
        symbol
      )}
    </svg>
  );
}
