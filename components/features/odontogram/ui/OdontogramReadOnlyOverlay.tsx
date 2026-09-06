"use client";

import { Lock } from "lucide-react";

export type OdontogramReadOnlyReason =
  | "completed"
  | "not-started"
  | "unverified"
  | "no-permission";
interface OdontogramReadOnlyOverlayProps {
  reason?: OdontogramReadOnlyReason;
}
const REASON_TEXT: Record<OdontogramReadOnlyReason, string> = {

  completed: "Visita cerrada — solo lectura",
  "not-started": "La consulta aún no se ha iniciado",
  unverified: "No se pudo verificar el estado de esta visita",
  "no-permission": "Sin permiso para editar",
};
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
