"use client";

import { useId, type ReactNode } from "react";

import { Label } from "@/components/ui";
import { cn } from "@/lib/odontogram/utils";

/**
 * Receta ÚNICA del micro-label del módulo de odontograma.
 *
 * Por qué estos valores (había seis recetas distintas para el mismo elemento
 * visual y esta las unifica):
 * - `text-[11px]`: 10px era ilegible en mayúsculas y 12px (`text-xs`) engordaba
 *   demasiado las tarjetas densas del plan. 11px es el tamaño que ya usaba la
 *   mayoría del módulo (surface-selector, barra de visita, modal de agenda).
 * - `font-semibold`: el texto en mayúsculas a 11px necesita peso para leerse.
 * - `tracking-[0.08em]`: las mayúsculas piden interletrado (~8%); `tracking-wide`
 *   (0.025em) y `tracking-wider` (0.05em) se quedan cortos. 0.08em es además el
 *   valor ya dominante en el módulo.
 * - `text-subtle`: token semántico Bento de texto secundario (invierte solo por
 *   tema). NO `text-muted-foreground`, que es el gris de shadcn ajeno al sistema.
 *
 * Nota: al fijar tamaño de fuente, `tailwind-merge` retira el `leading-none` del
 * `<Label>` base y el interlineado vuelve al normal. Es a propósito — es el
 * mismo resultado que ya daban las recetas anteriores, así que la densidad
 * vertical no cambia. No añadas `leading-none` "para arreglarlo".
 */
export const ODONTOGRAM_FIELD_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle";

/**
 * Ids que `OdontogramField` reparte al control cuando se usa la forma de
 * función. Pensado para hacerle spread directo: `{...control}`.
 */
export interface OdontogramFieldControlProps {
  id: string;
  "aria-labelledby": string;
  "aria-describedby"?: string;
}

export interface OdontogramFieldProps {
  /** Texto del micro-label (en español). */
  label: ReactNode;
  /**
   * Id del control, para asociar el label por `htmlFor`. Solo necesario en la
   * forma de hijos planos con un control nativo (`<input>`, `<textarea>`).
   */
  htmlFor?: string;
  /** Texto de ayuda bajo el control. Se asocia por `aria-describedby`. */
  hint?: ReactNode;
  className?: string;
  /**
   * El control. Como nodo, o como función que recibe los ids ya calculados
   * para etiquetar controles no nativos (Radix).
   */
  children: ReactNode | ((control: OdontogramFieldControlProps) => ReactNode);
}

/**
 * Campo del módulo de odontograma: micro-label + control + ayuda opcional.
 *
 * Es el ÚNICO sitio donde se define el aspecto del label. No vuelvas a escribir
 * `text-[10px] … uppercase` a mano; si necesitas solo la clase, importa
 * `ODONTOGRAM_FIELD_LABEL_CLASS`.
 *
 * Accesibilidad — hay dos formas de uso según el control:
 *
 * @example Control nativo: basta `htmlFor` + `id`
 * <OdontogramField label="Notas" htmlFor="plan-notes">
 *   <OdontogramInput
 *     id="plan-notes"
 *     value={plan.notes ?? ""}
 *     onChange={(e) => update({ notes: e.target.value })}
 *   />
 * </OdontogramField>
 *
 * @example `OdontogramSelect` (Radix): `htmlFor` NO etiqueta un `<button>` de
 * forma fiable, así que el campo reparte los ids y el control los recibe enteros
 * <OdontogramField label="Estado" hint="Se guarda al seleccionar">
 *   {(control) => (
 *     <OdontogramSelect
 *       {...control}
 *       value={plan.status}
 *       onChange={(v) => update({ status: v as ClinicalEventStatus })}
 *       options={STATUS_OPTIONS}
 *     />
 *   )}
 * </OdontogramField>
 */
export function OdontogramField({
  label,
  htmlFor,
  hint,
  className,
  children,
}: OdontogramFieldProps) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const controlId = htmlFor ?? `${uid}-control`;
  const hintId = hint != null ? `${uid}-hint` : undefined;
  const isRenderProp = typeof children === "function";

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        id={labelId}
        // Solo ponemos `for` cuando sabemos que ese id existe de verdad: o lo
        // dio el consumidor, o lo estamos repartiendo por la forma de función.
        // Un `for` colgando no etiqueta nada y ensucia la auditoría de a11y.
        htmlFor={isRenderProp || htmlFor ? controlId : undefined}
        className={ODONTOGRAM_FIELD_LABEL_CLASS}
      >
        {label}
      </Label>

      {isRenderProp
        ? children({
            id: controlId,
            "aria-labelledby": labelId,
            "aria-describedby": hintId,
          })
        : children}

      {hint != null && (
        <p id={hintId} className="text-[11px] leading-snug text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}
