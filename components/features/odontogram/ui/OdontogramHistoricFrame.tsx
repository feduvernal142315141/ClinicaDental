"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";

interface OdontogramHistoricFrameProps {
  /** Fecha corta de la visita mostrada: "12 mar 2026". */
  visitLabel: string;
  children: ReactNode;
}

/**
 * Marco del odontograma cuando se está viendo una visita PASADA.
 *
 * Dos señales periféricas de coste 0 px —marco ámbar y chip con candado— que
 * acompañan a las de la barra de contexto. Ninguna es descartable: son la
 * respuesta al riesgo real de que un clínico documente creyendo estar en el
 * presente.
 *
 * NORMA (no "optimizar" en el futuro):
 * 1. Solo lectura NO es lo mismo que deshabilitado. Los dientes conservan su
 *    color clínico PLENO. Atenuarlos con un `opacity-50` destruiría la
 *    legibilidad diagnóstica justo en la vista cuya única función es leer.
 *    Lo que se retira son las affordances de edición, no la información.
 * 2. Ámbar, nunca rojo: esto no es un error, es una advertencia de contexto.
 *    La escala sale de `StatusBadge tone="warning"`.
 * 3. Nada de marca de agua diagonal sobre el lienzo: interfiere con el
 *    diagnóstico.
 * 4. El chip vive arriba-DERECHA. El marco envuelve tabs + lienzo, así que
 *    arriba-izquierda cae sobre la fila de pestañas y tapa "Odontograma".
 *    La derecha está libre: las pestañas se alinean a la izquierda, y el
 *    overlay de solo-lectura —que sí ocupa esa esquina— es mutuamente
 *    excluyente con el modo histórico por construcción (`readOnly &&
 *    !isHistoricMode`). El zoom vive abajo-derecha y la leyenda abajo-izquierda.
 */
export function OdontogramHistoricFrame({
  visitLabel,
  children,
}: OdontogramHistoricFrameProps) {
  return (
    <div
      className="rounded-bento relative flex min-h-0 flex-1 flex-col"
      aria-readonly="true"
    >
      {children}

      {/* Marco como capa propia y no como `outline`/`ring` del contenedor: el
          spinner de transición es `absolute inset-0 z-10` dentro de children y
          taparía un borde pintado por el padre justo en el instante de entrar
          al modo histórico. Al ser `inset` tampoco lo recorta el
          `overflow-hidden` del lienzo con zoom. */}
      <div
        aria-hidden
        className="rounded-bento pointer-events-none absolute inset-0 z-30 ring-2 ring-amber-400/50 ring-inset"
      />

      <div className="pointer-events-none absolute top-2.5 right-4 z-30 flex max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-400/25 backdrop-blur-sm dark:text-amber-300">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">Solo lectura · {visitLabel}</span>
      </div>
    </div>
  );
}
