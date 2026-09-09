"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui";
import { useToothLabel } from "@/lib/contexts/tooth-notation-context";
import {
  ToothNotationLabel,
  formatToothListPlain,
  type ToothNotation,
} from "@/lib/odontogram/notation";
import { cn } from "@/lib/utils/utils";

/**
 * Dentición permanente en FDI/ISO 3950, por cuadrantes y en orden anatómico (de
 * la muela del juicio a la línea media). El FDI es la IDENTIDAD de la pieza —
 * es lo que se guarda, lo que viaja a `onToggle` y lo que va en la `key`—; de
 * `lib/odontogram/notation` solo llega la capa de PINTURA (cómo se escribe).
 */
const FDI_QUADRANTS: ReadonlyArray<{ label: string; teeth: number[] }> = [
  { label: "Superior derecho", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: "Superior izquierdo", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: "Inferior izquierdo", teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
  { label: "Inferior derecho", teeth: [48, 47, 46, 45, 44, 43, 42, 41] },
];

interface PlanToothSelectorProps {
  selected: ReadonlySet<number>;
  onToggle: (fdi: number) => void;
  onClear: () => void;
  disabled?: boolean;
}

/**
 * Lista de piezas elegidas, en forma PLANA: "16, 17, 26" en FDI, "6 superior
 * derecho, 7 superior derecho" en Palmer.
 *
 * El orden es numérico POR FDI (anatómico y estable, el mismo del selector y el
 * de la tabla): se ordena el número —la identidad— y solo después se escribe.
 * Ordenar por el texto pintado devolvería un orden distinto en cada
 * nomenclatura y rompería la correspondencia con la rejilla de al lado.
 *
 * Plana y no compacta porque este texto acaba en prosa ("las piezas …"): en
 * Palmer la forma compacta escribe 16/26/36 como "6, 6, 6" — tres piezas
 * distintas indistinguibles en un presupuesto que el paciente firma.
 */
export function formatSelectedTeeth(
  selected: ReadonlySet<number>,
  notation: ToothNotation,
): string {
  return formatToothListPlain(
    Array.from(selected).sort((a, b) => a - b),
    notation,
  );
}

/**
 * PlanToothSelector
 *
 * Selección MÚLTIPLE de piezas FDI para la pestaña "Sobre una pieza".
 *
 * Va dentro de un desplegable abierto por defecto y no como bloque fijo: la
 * rejilla ocupa cuatro filas y, en el panel lateral de un móvil, empujaría la
 * lista de servicios fuera de la pantalla. El resumen del disparador ("Piezas:
 * 16, 17") mantiene visible lo elegido aunque esté plegado, que es lo único que
 * hay que poder comprobar sin abrirlo.
 *
 * Cada pieza es un `<button aria-pressed>` y no un `<div onClick>`: es un
 * conmutador real, alcanzable con teclado y anunciado como "Diente 16,
 * pulsado". El estado nunca se comunica solo con color (WCAG 2.2 — 1.4.1): el
 * resumen de arriba enumera las piezas activas en texto.
 *
 * Lo pintado sigue la nomenclatura de la clínica; el FDI no se mueve de la
 * `key`, del `onToggle` ni del `aria-pressed`.
 */
export function PlanToothSelector({
  selected,
  onToggle,
  onClear,
  disabled = false,
}: PlanToothSelectorProps) {
  const { notation, describe } = useToothLabel();
  const summary = formatSelectedTeeth(selected, notation);

  return (
    <Collapsible
      defaultOpen
      className="shrink-0 rounded-bento border border-hairline bg-canvas"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <CollapsibleTrigger
          disabled={disabled}
          className="group flex min-h-[2rem] min-w-0 flex-1 items-center gap-2 rounded-lg text-left text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-subtle transition-transform group-data-[state=closed]:-rotate-90"
          />
          {/* `title` con la lista entera: el resumen va truncado y la forma
              plana es larga en Palmer ("6 superior derecho, …"). Se trunca el
              texto, nunca la información — y desplegado está la rejilla, que
              es la comprobación de verdad. */}
          <span className="min-w-0 truncate" title={summary || undefined}>
            {summary ? (
              <>
                <span className="text-subtle">Piezas: </span>
                <span className="font-medium tabular-nums">{summary}</span>
              </>
            ) : (
              <span className="text-subtle">Sin piezas seleccionadas</span>
            )}
          </span>
        </CollapsibleTrigger>

        {selected.size > 0 && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Quitar todas
          </button>
        )}
      </div>

      <CollapsibleContent>
        <div
          role="group"
          // Sin nombrar la nomenclatura: cada botón ya se anuncia en forma
          // plana ("Diente 6 superior derecho"), que no necesita traducción.
          aria-label="Piezas dentales por cuadrante"
          className="space-y-2 border-t border-hairline px-3 py-2.5"
        >
          {FDI_QUADRANTS.map((quadrant) => (
            <div key={quadrant.label}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                {quadrant.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {quadrant.teeth.map((fdi) => {
                  const isActive = selected.has(fdi);
                  return (
                    <button
                      key={fdi}
                      type="button"
                      aria-pressed={isActive}
                      // Forma PLANA: "Diente 6 superior derecho". El glifo de
                      // dentro es `aria-hidden` (su corchete es CSS y no se
                      // lee), así que el nombre accesible tiene que decir el
                      // cuadrante o las cuatro piezas "6" suenan igual.
                      aria-label={describe([fdi])}
                      disabled={disabled}
                      onClick={() => onToggle(fdi)}
                      // 32×32: por encima del mínimo de 24×24 de WCAG 2.2
                      // (2.5.8) incluso con el dedo sobre el iPad del sillón.
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium tabular-nums transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        // `brand-strong` y no `brand`: en oscuro `--brand` se
                        // aclara a blue-500 y el número blanco cae a 3.68:1 (AA
                        // pide 4.5:1). Y el número de la pieza es justo el dato
                        // que hay que poder verificar antes de presupuestar.
                        //
                        // En Palmer el botón APAGADO cede su marco al corchete
                        // (mismo motivo que el cuadro de la tabla: dos filetes
                        // paralelos y el corchete deja de leerse), y el relleno
                        // `bg-surface` sobre el `bg-canvas` del panel sigue
                        // dibujando la tecla. El botón ENCENDIDO no necesita
                        // excepción: su borde es del color de su propio relleno
                        // (`brand-strong`), así que no compite con nada.
                        isActive
                          ? "border-brand-strong bg-brand-strong text-white"
                          : notation === "palmer"
                            ? "border-transparent bg-surface text-ink hover:bg-hover hover:text-brand"
                            : "border-hairline bg-surface text-ink hover:border-brand hover:text-brand",
                      )}
                    >
                      <ToothNotationLabel fdi={fdi} notation={notation} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
