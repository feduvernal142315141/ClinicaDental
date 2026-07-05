"use client";

import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils/utils";

export interface OdontogramEventCardProps {
  /** Número del diente, e.g. 11 */
  toothNumber: number;
  /** Superficies afectadas */
  surfaces?: string[];
  /** Nombre visible del evento / procedimiento */
  displayName: string;
  /** Etiqueta del tipo de evento ("Diagnóstico", "Plan", "Realizado") */
  typeLabel: string;
  /** Color semántico del tag (emitido por useEventFormatting.getEventTagColor) */
  tagColor: "red" | "gold" | "blue" | "default";
  /** Notas opcionales */
  notes?: string;
  /** Fecha formateada */
  date: string;
  /** Callback al hacer click en la tarjeta */
  onClick?: () => void;
}

/** Mapea el color semántico del tag a clases de token Bento */
const TAG_CLASSES: Record<OdontogramEventCardProps["tagColor"], string> = {
  red: "border-rose-400/25 bg-rose-500/15 text-rose-400",
  gold: "border-amber-400/25 bg-amber-500/15 text-amber-400",
  blue: "border-sky-400/25 bg-sky-500/15 text-sky-400",
  default: "border-hairline bg-hover text-subtle",
};

/**
 * Tarjeta de evento clínico para las listas de Diagnósticos / Planes / Realizados.
 * Compuesta con Card Bento + tag de tokens semánticos.
 */
export function OdontogramEventCard({
  toothNumber,
  surfaces = [],
  displayName,
  typeLabel,
  tagColor,
  notes,
  date,
  onClick,
}: OdontogramEventCardProps) {
  return (
    <Card
      onClick={onClick}
      className="mb-3 cursor-pointer gap-0 rounded-xl border-hairline py-0 shadow-sm transition-colors hover:bg-hover"
    >
      <CardContent className="px-4 py-3">
        <div className="mb-2 flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-lg font-semibold text-ink">
              Diente {toothNumber}
            </p>
            {surfaces.length > 0 && (
              <p className="text-sm text-subtle">
                Superficies: {surfaces.join(", ")}
              </p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium",
              TAG_CLASSES[tagColor] ?? TAG_CLASSES.default,
            )}
          >
            {typeLabel}
          </span>
        </div>

        <div className="space-y-1">
          <p className="font-medium text-ink">{displayName}</p>
          {notes && <p className="text-sm text-subtle">{notes}</p>}
          <div className="flex items-center gap-2 text-sm text-subtle">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
