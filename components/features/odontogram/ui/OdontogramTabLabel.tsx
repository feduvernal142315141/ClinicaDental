"use client";

import { Badge } from "antd";
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
 * Label de tab con contador numérico AntD Badge.
 * El badge se oculta automáticamente cuando count es 0 o undefined.
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
        <Badge
          count={count}
          size="small"
          style={{ marginLeft: 6 }}
          color="default"
        />
      )}
    </span>
  );
}
