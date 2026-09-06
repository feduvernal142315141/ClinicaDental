"use client";

import { Lock } from "lucide-react";

/**
 * Motivos por los que el lienzo está en solo lectura.
 *
 * Se exporta para que el anfitrión (`PatientOdontogramPanel`) tipe su mapeo con
 * ESTE union y no con una copia local: la copia local tenía dos valores y hacía
 * que colapsar tres motivos distintos en uno pasara la compilación.
 */
export type OdontogramReadOnlyReason =
  | "completed"
  | "not-started"
  | "unverified"
  | "no-permission";

interface OdontogramReadOnlyOverlayProps {
  reason?: OdontogramReadOnlyReason;
}

const REASON_TEXT: Record<OdontogramReadOnlyReason, string> = {
  // "cerrada" y no "finalizada": el motivo `terminal` de `getVisitEditability`
  // agrupa completed, cancelled y no_show, y una cita cancelada o a la que el
  // paciente no acudió nunca llegó a ocurrir.
  completed: "Visita cerrada — solo lectura",
  "not-started": "La consulta aún no se ha iniciado",
  unverified: "No se pudo verificar el estado de esta visita",
  "no-permission": "Sin permiso para editar",
};

/**
 * US-03 — Indicador de Modo Lectura sobre el odontograma.
 * El rótulo solo NOMBRA el motivo y no ofrece CTA: iniciar una consulta se hace
 * desde la cabecera de la ficha, y los demás motivos no son accionables.
 */
export function OdontogramReadOnlyOverlay({
  reason = "no-permission",
}: OdontogramReadOnlyOverlayProps) {
  return (
    <div className="absolute top-3 right-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-2">
      <div className="pointer-events-none flex items-center gap-1.5 rounded-md border border-hairline bg-elevated/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
        <Lock className="h-3.5 w-3.5 shrink-0 text-subtle" />
        <span className="text-xs font-medium text-subtle">
          {REASON_TEXT[reason]}
        </span>
      </div>
    </div>
  );
}
