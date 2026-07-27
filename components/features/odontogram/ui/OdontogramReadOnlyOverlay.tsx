"use client";

import { Lock } from "lucide-react";

type ReadOnlyReason = "completed" | "no-permission";

interface OdontogramReadOnlyOverlayProps {
  reason?: ReadOnlyReason;
}

const REASON_TEXT: Record<ReadOnlyReason, string> = {
  completed: "Visita finalizada — solo lectura",
  "no-permission": "Sin permiso para editar",
};

/**
 * US-03 — Indicador de Modo Lectura sobre el odontograma.
 * Solo quedan motivos NO accionables: no hay CTA que ofrecer. La ausencia de
 * consulta ya no bloquea la edición, así que dejó de ser un motivo.
 */
export function OdontogramReadOnlyOverlay({
  reason = "no-permission",
}: OdontogramReadOnlyOverlayProps) {
  return (
    <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
      <div className="pointer-events-none flex items-center gap-1.5 rounded-md border border-hairline bg-elevated/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
        <Lock className="h-3.5 w-3.5 text-subtle" />
        <span className="text-xs font-medium text-subtle">
          {REASON_TEXT[reason]}
        </span>
      </div>
    </div>
  );
}
