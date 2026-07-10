"use client";

import * as React from "react";
import { Check, Save, X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/primitives/shadcn/button";
import { cn } from "@/lib/utils/utils";

type SecondaryVariant = "ghost" | "outline";

export interface FormActionBarProps {
  /**
   * Estado de cambios del formulario. Si se pasa, se muestra la línea de estado
   * `aria-live` a la izquierda ("Tienes cambios sin guardar" / "Todo está
   * guardado"). Cablea `form.formState.isDirty`.
   */
  isDirty?: boolean;
  dirtyLabel?: string;
  cleanLabel?: string;
  /** Oculta la línea de estado aunque se pase `isDirty`. */
  hideStatus?: boolean;

  /** Acción secundaria (cancelar / descartar). Sin `onSecondary` no se renderiza. */
  onSecondary?: () => void;
  secondaryLabel?: string;
  /** Icono de la acción secundaria; `null` para omitirlo. */
  secondaryIcon?: LucideIcon | null;
  secondaryVariant?: SecondaryVariant;
  /** Deshabilita la secundaria cuando no hay cambios (patrón "Descartar"). */
  disableSecondaryWhenClean?: boolean;

  /** Acción primaria (guardar). Por defecto `type="submit"` (dentro de un `<form>`). */
  submitLabel?: string;
  /** Icono del submit; `null` para omitirlo. */
  submitIcon?: LucideIcon | null;
  submitType?: "submit" | "button";
  /** Handler cuando `submitType="button"`. */
  onSubmit?: () => void;
  /** Deshabilita el submit cuando no hay cambios (patrón settings). */
  disableSubmitWhenClean?: boolean;

  /** Muestra spinner en el submit y deshabilita ambos botones. */
  loading?: boolean;
  /** Deshabilita ambos botones (además de `loading`). */
  disabled?: boolean;
  /** Deshabilita SOLO el submit (p. ej. rol de sistema no editable), dejando la secundaria activa. */
  submitDisabled?: boolean;

  /** Contenido custom para la zona izquierda (reemplaza la línea de estado). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Barra de acciones sticky ESTÁNDAR para formularios de página (Bento 2026).
 *
 * Permanece visible al hacer scroll (`sticky bottom-4`), con una línea de estado
 * opcional (`aria-live`) a la izquierda y los botones Descartar/Cancelar + Guardar
 * a la derecha. Es el estándar del proyecto para las acciones guardar/cancelar de
 * los formularios de PÁGINA (pacientes, roles, doctores, servicios, citas,
 * opciones generales). NO usar dentro de modales/drawers: esos ya tienen su
 * propio footer persistente.
 *
 * Debe renderizarse como último hijo del `<form>` (para que `type="submit"`
 * dispare el envío) y dentro del contenedor scrollable de la página.
 */
export function FormActionBar({
  isDirty,
  dirtyLabel = "Tienes cambios sin guardar",
  cleanLabel = "Todo está guardado",
  hideStatus = false,
  onSecondary,
  secondaryLabel = "Cancelar",
  secondaryIcon = X,
  secondaryVariant = "ghost",
  disableSecondaryWhenClean = false,
  submitLabel = "Guardar cambios",
  submitIcon = Save,
  submitType = "submit",
  onSubmit,
  disableSubmitWhenClean = false,
  loading = false,
  disabled = false,
  submitDisabled = false,
  children,
  className,
}: FormActionBarProps) {
  const isClean = isDirty === false;
  const showStatus = !children && !hideStatus && isDirty !== undefined;

  const secondaryDisabled =
    disabled || loading || (disableSecondaryWhenClean && isClean);
  const submitIsDisabled =
    disabled ||
    loading ||
    submitDisabled ||
    (disableSubmitWhenClean && isClean);

  const SecondaryIcon = secondaryIcon ?? undefined;
  const SubmitIcon = submitIcon ?? undefined;

  const leftSlot = children ? (
    <div className="min-w-0">{children}</div>
  ) : showStatus ? (
    <p aria-live="polite" className="flex items-center gap-2 text-sm text-subtle">
      {isDirty ? (
        <>
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500"
          />
          {dirtyLabel}
        </>
      ) : (
        <>
          <Check
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-emerald-500"
          />
          {cleanLabel}
        </>
      )}
    </p>
  ) : null;

  return (
    <div
      className={cn(
        "sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-hairline bg-surface/85 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-surface/70 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {leftSlot}
      <div className="flex items-center gap-2 sm:ml-auto">
        {onSecondary && (
          <Button
            type="button"
            variant={secondaryVariant}
            onClick={onSecondary}
            disabled={secondaryDisabled}
            className="gap-2"
          >
            {SecondaryIcon && (
              <SecondaryIcon aria-hidden="true" className="h-4 w-4" />
            )}
            {secondaryLabel}
          </Button>
        )}
        <Button
          type={submitType}
          onClick={submitType === "button" ? onSubmit : undefined}
          loading={loading}
          disabled={submitIsDisabled}
          className="gap-2"
        >
          {SubmitIcon && <SubmitIcon aria-hidden="true" className="h-4 w-4" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
