"use client";

import { useMemo } from "react";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";

export interface AvailabilitySlotPickerProps {
  /** Hora seleccionada "HH:mm". Inyectada por el Controller. */
  value?: string;
  /** Handler de cambio. Inyectado por el Controller. */
  onChange?: (value: string) => void;
  /** Horas disponibles del doctor para la fecha elegida, como "HH:mm". */
  availableTimes: string[];
  /** True mientras se consulta la disponibilidad. */
  loading?: boolean;
  /** True cuando hay doctor y fecha seleccionados. */
  ready?: boolean;
  /** Deshabilita la interacción. */
  disabled?: boolean;
  /**
   * Si el doctor atiende el día elegido. Cuando es `false`, el estado vacío
   * explica que el día no está disponible en vez de "sin horas libres".
   */
  dayWorked?: boolean;
  "aria-invalid"?: boolean;
}

const PERIODS = [
  { key: "morning", label: "Mañana", from: 0, to: 12 },
  { key: "afternoon", label: "Tarde", from: 12, to: 18 },
  { key: "evening", label: "Noche", from: 18, to: 24 },
] as const;

const CONTAINER = "rounded-xl border border-hairline bg-surface p-4 min-h-[120px]";

/**
 * Selector de horas guiado por disponibilidad (sin Ant Design).
 *
 * En lugar de un TimePicker libre (que permite elegir horas inválidas y fallar
 * en el servidor), renderiza únicamente los slots disponibles del doctor para
 * la fecha elegida como botones seleccionables, agrupados por periodo.
 */
export function AvailabilitySlotPicker({
  value,
  onChange,
  availableTimes,
  loading = false,
  ready = false,
  disabled = false,
  dayWorked,
  "aria-invalid": ariaInvalid,
}: AvailabilitySlotPickerProps) {
  // Mezclar el value actual para que en edición el slot propio de la cita
  // (que el endpoint de disponibilidad puede reportar como ocupado) se muestre.
  const slots = useMemo(() => {
    const set = new Set(availableTimes);
    if (value) set.add(value);
    return Array.from(set).sort();
  }, [availableTimes, value]);

  const grouped = useMemo(
    () =>
      PERIODS.map((period) => ({
        ...period,
        times: slots.filter((t) => {
          const hour = Number(t.slice(0, 2));
          return hour >= period.from && hour < period.to;
        }),
      })).filter((period) => period.times.length > 0),
    [slots],
  );

  if (!ready) {
    return (
      <div
        className={cn(
          CONTAINER,
          "flex items-center justify-center gap-2 text-center text-sm text-subtle",
        )}
      >
        <Calendar className="h-4 w-4 shrink-0" />
        Selecciona un doctor y una fecha para ver las horas disponibles.
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={cn(
          CONTAINER,
          "flex items-center justify-center gap-2 text-sm text-subtle",
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Buscando horas disponibles…
      </div>
    );
  }

  if (slots.length === 0) {
    const description =
      dayWorked === false
        ? "El doctor no atiende este día. Elige una fecha resaltada en el calendario."
        : "Sin horas libres para esta fecha. Prueba con otra fecha o una duración menor.";
    return (
      <div
        className={cn(
          CONTAINER,
          "flex flex-col items-center justify-center gap-2 text-center text-sm text-subtle",
        )}
      >
        <Clock className="h-5 w-5" />
        {description}
      </div>
    );
  }

  return (
    <div
      className={cn(CONTAINER, ariaInvalid && "border-rose-500/60")}
      role="group"
      aria-label="Horas disponibles"
    >
      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.key} className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-subtle">
              <Clock className="h-3.5 w-3.5" />
              {group.label}
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2">
              {group.times.map((time) => {
                const selected = time === value;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => onChange?.(time)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-sm tabular-nums transition-colors",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      selected
                        ? "border-brand bg-brand font-semibold text-white"
                        : "border-hairline bg-elevated text-ink hover:border-brand/40 hover:bg-hover",
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
