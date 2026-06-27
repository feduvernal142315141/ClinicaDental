"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";
import { cn } from "@/lib/utils/utils";
import { Select } from "@/components/ui/controls/select";
import {
  MONTHS_ES,
  WEEKDAYS_ES_MON,
  mondayFirstWeekday,
  dateToLocalDate,
  parseLocalValue,
  isSameLocalDay,
} from "@/lib/datetime";

export interface AvailabilityCalendarProps {
  /** Fecha seleccionada 'YYYY-MM-DD'. */
  value: string;
  onChange: (value: string) => void;
  /** Predicado dayjs → true si la fecha está deshabilitada (pasada o no laboral). */
  disabledDate?: (date: Dayjs) => boolean;
  /** Predicado dayjs → true si el doctor atiende ese día (para resaltarlo). */
  isWorkingDay?: (date: Dayjs) => boolean;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}

/**
 * Calendario mensual inline (estilo Calendly/Doctoralia) sin controles nativos
 * ni Ant Design. Resalta los días que el doctor SÍ atiende y deshabilita
 * fechas pasadas / no laborales. Trabaja en hora LOCAL; value 'YYYY-MM-DD'.
 */
export function AvailabilityCalendar({
  value,
  onChange,
  disabledDate,
  isWorkingDay,
  disabled = false,
  className,
  "aria-invalid": ariaInvalid,
}: AvailabilityCalendarProps) {
  const selected = parseLocalValue(value);
  const today = new Date();
  const [view, setView] = React.useState<Date>(selected ?? today);

  // Si llega un value nuevo (edición / prefill), centrar el calendario en él.
  React.useEffect(() => {
    if (selected) setView(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const startPad = mondayFirstWeekday(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthOptions = MONTHS_ES.map((m, i) => ({ value: String(i), label: m }));
  const baseYear = today.getFullYear();
  const yearsSet = new Set<number>([baseYear, baseYear + 1, baseYear + 2, year]);
  const yearOptions = Array.from(yearsSet)
    .sort((a, b) => a - b)
    .map((y) => ({ value: String(y), label: String(y) }));

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-3",
        ariaInvalid ? "border-rose-500/60" : "border-hairline",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      role="group"
      aria-label="Calendario, selecciona una fecha disponible"
      aria-disabled={disabled || undefined}
    >
      {/* Cabecera: navegación + mes/año */}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <div className="flex-1">
            <Select
              value={String(month)}
              onChange={(m) => setView(new Date(year, Number(m), 1))}
              options={monthOptions}
              aria-label="Mes"
            />
          </div>
          <div className="w-24">
            <Select
              value={String(year)}
              onChange={(y) => setView(new Date(Number(y), month, 1))}
              options={yearOptions}
              aria-label="Año"
            />
          </div>
        </div>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Cabecera de días */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-subtle">
        {WEEKDAYS_ES_MON.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Grilla del mes */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />;
          const d = new Date(year, month, day);
          const djs = dayjs(d);
          const off = disabledDate ? disabledDate(djs) : false;
          const working = isWorkingDay ? isWorkingDay(djs) : false;
          const isSel = selected ? isSameLocalDay(d, selected) : false;
          const isToday = isSameLocalDay(d, today);
          return (
            <button
              key={day}
              type="button"
              disabled={off}
              aria-pressed={isSel}
              aria-label={`${day} de ${MONTHS_ES[month]} de ${year}`}
              onClick={() => !off && onChange(dateToLocalDate(d))}
              className={cn(
                "relative h-9 rounded-lg text-sm tabular-nums transition-colors",
                off && "cursor-not-allowed text-subtle/40",
                !off && isSel && "bg-brand font-semibold text-white",
                !off &&
                  !isSel &&
                  working &&
                  "bg-brand/10 font-medium text-brand hover:bg-brand/20",
                !off && !isSel && !working && "text-ink hover:bg-hover",
                !off && !isSel && isToday && "ring-1 ring-brand/50",
              )}
            >
              {day}
              {!off && !isSel && working && (
                <span className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex items-center gap-4 border-t border-hairline pt-2 text-[11px] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-subtle/40" /> No disponible
        </span>
      </div>
    </div>
  );
}
