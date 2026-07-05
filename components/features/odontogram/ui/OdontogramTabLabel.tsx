"use client";

import type { ReactNode } from "react";

export interface OdontogramTabLabelProps {
  /** Texto visible de la tab */
  label: string;
  /** Cantidad de items; se oculta cuando es 0 */
  count?: number;
  /** Ícono opcional antes del texto */
  icon?: ReactNode;
}

/**
 * Label de tab con contador numérico en pill Bento.
 * El contador se oculta automáticamente cuando count es 0 o undefined.
 */
export function OdontogramTabLabel({
  label,
  count = 0,
  icon,
}: OdontogramTabLabelProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {label}
      {count > 0 && (
        <span className="ml-1 rounded-full bg-hover px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-subtle">
          {count}
        </span>
      )}
    </span>
  );
}
