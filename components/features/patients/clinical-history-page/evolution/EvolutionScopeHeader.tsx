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
 * Barra sutil sobre la columna de evolución.
 *
 * SIMPLIFICADA a propósito. Antes declaraba en pantalla, de forma permanente,
 * el alcance completo del listado ("registrada en este sistema · N consultas ·
 * ordenado por fecha de atención · no incluye canceladas · solo la última
 * edición"). Ese bloque metía un ladrillo de texto entre el compositor y la
 * primera consulta, y el diseño lo quiere fuera.
 *
 * Esas declaraciones NO se han perdido, y no podían perderse: viajan íntegras
 * en el pie del documento IMPRESO —repetido en cada folio—, que es la copia que
 * se entrega al paciente y donde la norma exige que consten.
 *
 * Lo que SÍ se queda en pantalla es el aviso de truncado, y solo cuando ocurre
 * de verdad: ahí el listado aparenta ser el historial completo sin serlo, y eso
 * no puede quedar únicamente en el papel.
 */
export function EvolutionScopeHeader({
  shownCount,
  truncated,
  onPrint,
  printPreparing = false,
  printProgress,
}: EvolutionScopeHeaderProps) {
  if (!truncated && !onPrint) return null;

  return (
    <div className="mb-2 flex flex-col gap-2">
      {onPrint ? (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onPrint}
            disabled={printPreparing}
            aria-live="polite"
            title={
              shownCount === 1
                ? "Imprimir la consulta mostrada"
                : `Imprimir las ${shownCount} consultas mostradas`
            }
            className={cn(
              "h-8 shrink-0 gap-1.5 px-2 text-xs text-subtle hover:text-ink",
              "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:px-3",
            )}
          >
            {printPreparing ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {/* El feed carga perezosamente, así que imprimir obliga a traer las
                visitas que falten. Con un historial largo eso son segundos de
                espera: sin este rótulo el usuario pulsa y no ve nada pasar. */}
            {printPreparing && printProgress
              ? `Preparando… ${printProgress.loaded}/${printProgress.total}`
              : "Imprimir"}
          </Button>
        </div>
      ) : null}

      {truncated ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-400/25 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Se muestran las 100 consultas más recientes registradas; puede haber
            consultas anteriores no listadas.
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default EvolutionScopeHeader;
