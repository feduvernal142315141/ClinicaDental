"use client";

import * as React from "react";
import { CornerUpLeft, History } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/utils";

/**
 * VisitRibbon — cinta de contexto de la visita.
 *
 * Va SIEMPRE entre la cabecera del paciente y las pestañas, a todo el ancho, y
 * nunca dentro de una pestaña: lo que anuncia (estoy escribiendo en una consulta
 * en curso / estoy leyendo una visita pasada) condiciona todo lo que hay debajo,
 * así que no puede vivir dentro de una sola sección.
 *
 * No usa tokens `success`/`warning` porque no existen en el sistema: los estados
 * de color se escriben con la receta dual-tema (tinte al 15% + texto -700/-300
 * + ring al 25%), que es la única que cumple contraste en claro y en oscuro.
 */
export type VisitRibbonState =
  | {
      kind: "active";
      startedAt?: string;
      dateLabel: string;
      doctorName?: string;
    }
  | { kind: "historic"; dateLabel: string };

export interface VisitRibbonProps {
  /** `null` no renderiza nada (no hay visita en contexto). */
  state: VisitRibbonState | null;
  /** Indicador de autoguardado del host (solo se pinta en `active`). */
  autosaveSlot?: React.ReactNode;
  onFinalize?: () => void;
  finalizeDisabled?: boolean;
  /** Motivo del bloqueo. Se muestra VISIBLE, no solo en un `title`. */
  finalizeDisabledReason?: string;
  onReturnToCurrent?: () => void;
}

const ACTIVE_TONE =
  "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-400/25 dark:text-emerald-300";

const HISTORIC_TONE =
  "bg-amber-500/15 text-amber-700 ring-1 ring-amber-400/25 dark:text-amber-300";

/** Objetivo táctil de 44px en pantallas de dedo, 40px con ratón. */
const COARSE_TOUCH = "[@media(pointer:coarse)]:h-11";

const pad = (n: number) => String(n).padStart(2, "0");

/** Milisegundos transcurridos → "HH:MM:SS". Nunca negativo. */
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function VisitRibbon({
  state,
  autosaveSlot,
  onFinalize,
  finalizeDisabled = false,
  finalizeDisabledReason,
  onReturnToCurrent,
}: VisitRibbonProps) {
  const startedAt = state?.kind === "active" ? state.startedAt : undefined;

  const startedAtMs = React.useMemo(() => {
    if (!startedAt) return null;
    const parsed = new Date(startedAt).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }, [startedAt]);

  // Hidratación: el tiempo transcurrido depende del reloj, así que servidor y
  // cliente producirían marcados distintos. El cronómetro no se pinta hasta
  // después del montaje. Este guard es obligatorio, ya costó un bug antes.
  const [mounted, setMounted] = React.useState(false);
  const [nowMs, setNowMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (startedAtMs === null) {
      setNowMs(null);
      return;
    }
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [startedAtMs]);

  if (!state) return null;

  if (state.kind === "historic") {
    return (
      <div
        className={cn(
          "flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-bento px-4 py-3",
          HISTORIC_TONE,
        )}
      >
        <History className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium">
          {`Viendo la visita del ${state.dateLabel} · registro de solo lectura`}
        </p>
        {onReturnToCurrent ? (
          <Button
            type="button"
            variant="outline"
            onClick={onReturnToCurrent}
            className={cn("shrink-0", COARSE_TOUCH)}
          >
            <CornerUpLeft className="h-4 w-4" aria-hidden="true" />
            Volver a hoy
          </Button>
        ) : null}
      </div>
    );
  }

  const elapsed =
    mounted && startedAtMs !== null && nowMs !== null
      ? formatElapsed(nowMs - startedAtMs)
      : null;

  const showDisabledReason =
    finalizeDisabled && Boolean(finalizeDisabledReason);

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-bento px-4 py-3",
        ACTIVE_TONE,
      )}
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none"
      />

      <p className="min-w-0 text-sm font-medium">
        {`Consulta en curso · ${state.dateLabel}`}
        {state.doctorName ? ` · Dr. ${state.doctorName}` : ""}
      </p>

      {elapsed ? (
        <span
          role="timer"
          aria-live="off"
          className="shrink-0 font-mono text-sm tabular-nums"
        >
          {elapsed}
        </span>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        {autosaveSlot}

        {showDisabledReason ? (
          <span className="text-xs font-medium">{finalizeDisabledReason}</span>
        ) : null}

        {onFinalize ? (
          <Button
            type="button"
            onClick={onFinalize}
            disabled={finalizeDisabled}
            className={cn("h-10 shrink-0", COARSE_TOUCH)}
          >
            Finalizar consulta
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default VisitRibbon;
