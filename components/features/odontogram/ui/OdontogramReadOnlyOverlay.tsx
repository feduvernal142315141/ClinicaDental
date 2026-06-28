"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReadOnlyReason = "no-consultation" | "completed" | "no-permission";

interface OdontogramReadOnlyOverlayProps {
  reason?: ReadOnlyReason;
  /** CTA para iniciar consulta (solo cuando el motivo es 'no-consultation'). */
  onStartConsultation?: () => void;
}

const REASON_TEXT: Record<ReadOnlyReason, string> = {
  "no-consultation": "Inicia una consulta para editar",
  completed: "Visita finalizada — solo lectura",
  "no-permission": "Sin permiso para editar",
};

/**
 * US-03 — Indicador de Modo Lectura sobre el odontograma.
 * Muestra el motivo y, cuando aplica, un CTA para iniciar la consulta.
 */
export function OdontogramReadOnlyOverlay({
  reason = "no-consultation",
  onStartConsultation,
}: OdontogramReadOnlyOverlayProps) {
  const showCta = reason === "no-consultation" && !!onStartConsultation;

  return (
    <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
      <div className="pointer-events-none flex items-center gap-1.5 rounded-md border border-hairline bg-elevated/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
        <Lock className="h-3.5 w-3.5 text-subtle" />
        <span className="text-xs font-medium text-subtle">
          {REASON_TEXT[reason]}
        </span>
      </div>

      {showCta && (
        <Button
          type="button"
          size="sm"
          onClick={onStartConsultation}
          className="pointer-events-auto"
        >
          Iniciar consulta
        </Button>
      )}
    </div>
  );
}
