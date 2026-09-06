"use client";

import { AlertTriangle, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/utils";

export interface EvolutionScopeHeaderProps {
  /** Cuántas consultas se están pintando realmente en la columna. */
  shownCount: number;
  /**
   * `true` cuando el listado llegó al tope del backend (100) y por tanto
   * puede haber consultas anteriores que NO se están mostrando.
   */
  truncated: boolean;
  onPrint?: () => void;
  /** El documento se está preparando: hay que cargar los registros que faltan. */
  printPreparing?: boolean;
  /** Progreso de esa carga, para que el botón diga por qué tarda. */
  printProgress?: { loaded: number; total: number };
}

/**
 * Cabecera de alcance de la columna de evolución clínica.
 *
 * No es una tarjeta: es texto sobre el fondo de la vista. Su única razón de
 * existir es declarar, de forma permanente y visible (nunca en un tooltip),
 * QUÉ contiene exactamente el listado que hay debajo y qué no contiene.
 *
 * El título dice "registrada en este sistema" a propósito: el listado excluye
 * las consultas canceladas y está capado por el backend, así que llamarlo
 * "historia clínica completa" o "todas las consultas" sería una afirmación
 * falsa sobre un registro clínico-legal.
 */
export function EvolutionScopeHeader({
  shownCount,
  truncated,
  onPrint,
  printPreparing = false,
  printProgress,
}: EvolutionScopeHeaderProps) {
  const countText =
    shownCount === 1 ? "1 consulta mostrada" : `${shownCount} consultas mostradas`;

  return (
    <header className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">
            Evolución clínica registrada en este sistema
          </h2>
          {/* Declaración de alcance PERMANENTE: qué se muestra, con qué orden,
              qué se excluye y qué se conserva de cada nota. */}
          <p className="mt-1 text-[11px] leading-relaxed text-subtle">
            {countText} · Ordenado por fecha de atención, la más reciente primero ·
            No se incluyen las consultas canceladas · Se conserva únicamente la
            última edición de cada nota
          </p>
        </div>

        {onPrint ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrint}
            disabled={printPreparing}
            aria-live="polite"
            className={cn("shrink-0 gap-2", "pointer-coarse:h-11 pointer-coarse:px-4")}
          >
            {printPreparing ? (
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Printer className="h-4 w-4" aria-hidden="true" />
            )}
            {/* El feed carga perezosamente, así que imprimir obliga a traer las
                visitas que falten. Con un historial largo eso son segundos de
                espera: sin este rótulo el usuario pulsa y no ve nada pasar. */}
            {printPreparing && printProgress
              ? `Preparando documento… ${printProgress.loaded}/${printProgress.total}`
              : "Imprimir evolución"}
          </Button>
        ) : null}
      </div>

      {truncated ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-400/25 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Se muestran las 100 consultas más recientes registradas; puede haber
            consultas anteriores no listadas.
          </span>
        </div>
      ) : null}
    </header>
  );
}

export default EvolutionScopeHeader;
