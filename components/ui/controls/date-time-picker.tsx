"use client";

import * as React from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Select } from "@/components/ui/controls/select";
import {
  parseLocalValue,
  dateToLocalDate,
  isSameLocalDay,
  MONTHS_ES,
  WEEKDAYS_ES_MON,
  mondayFirstWeekday,
} from "@/lib/datetime";

export interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  showTime?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Año mínimo del selector de año (def. año actual − 100). */
  fromYear?: number;
  /** Año máximo del selector de año (def. año actual + 10). */
  toYear?: number;
  /** Permite limpiar el valor (X + botón "Limpiar"). Def. true. */
  allowClear?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: pad(i), label: pad(i) }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: pad(i), label: pad(i) }));
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * DateTimePicker corporativo (calendario + hora) sin controles nativos.
 * Trabaja en hora LOCAL; el value es 'YYYY-MM-DDTHH:mm' (o 'YYYY-MM-DD' si
 * showTime=false). La conversión a UTC se hace fuera (lib/datetime).
 */
export function DateTimePicker({
  value,
  onChange,
  showTime = true,
  min,
  max,
  disabled = false,
  className,
  id,
  fromYear,
  toYear,
  allowClear = true,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const selected = parseLocalValue(value);
  const minDate = parseLocalValue(min);
  const maxDate = parseLocalValue(max);
  const hh = selected ? pad(selected.getHours()) : "00";
  const mm = selected ? pad(selected.getMinutes()) : "00";

  const [view, setView] = React.useState<Date>(selected ?? new Date());
  React.useEffect(() => {
    if (open) setView(selected ?? new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = React.useCallback((focus = true) => {
    setOpen(false);
    if (focus) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  const compose = (d: Date, h: string, m: string) =>
    showTime ? `${dateToLocalDate(d)}T${h}:${m}` : dateToLocalDate(d);

  const dayDisabled = (d: Date) =>
    (minDate ? startOfDay(d) < startOfDay(minDate) : false) ||
    (maxDate ? startOfDay(d) > startOfDay(maxDate) : false);

  const pickDay = (d: Date) => {
    if (dayDisabled(d)) return;
    onChange(compose(d, hh, mm));
    if (!showTime) close();
  };

  const setTime = (h: string, m: string) => {
    const base = selected ?? new Date();
    onChange(compose(base, h, m));
  };

  // Display dd/mm/yyyy · HH:mm
  const display = selected
    ? `${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()}` +
      (showTime ? ` · ${hh}:${mm}` : "")
    : "";
  const placeholder = showTime ? "Selecciona fecha y hora" : "Selecciona una fecha";

  // Grilla del mes
  const year = view.getFullYear();
  const month = view.getMonth();
  const startPad = mondayFirstWeekday(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = new Date();

  const monthOptions = MONTHS_ES.map((m, i) => ({ value: String(i), label: m }));
  const baseYear = today.getFullYear();
  const minYear = fromYear ?? baseYear - 100;
  const maxYear = toYear ?? baseYear + 10;
  const yearSet = new Set<number>([year]);
  for (let y = minYear; y <= maxYear; y += 1) yearSet.add(y);
  const yearOptions = Array.from(yearSet)
    .sort((a, b) => a - b)
    .map((y) => ({ value: String(y), label: String(y) }));

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border bg-elevated px-3 py-2.5 text-sm transition-colors",
          "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30",
          open ? "border-brand ring-2 ring-brand/30" : "border-hairline",
          ariaInvalid && "border-rose-500/60",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {showTime ? (
          <Clock className="h-4 w-4 shrink-0 text-subtle" />
        ) : (
          <Calendar className="h-4 w-4 shrink-0 text-subtle" />
        )}
        <button
          ref={triggerRef}
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          aria-invalid={ariaInvalid}
          className={cn(
            "flex-1 truncate text-left outline-none tabular-nums",
            selected ? "text-ink" : "text-subtle",
          )}
        >
          {display || placeholder}
        </button>
        {allowClear && selected && !disabled && (
          <button
            type="button"
            aria-label="Limpiar"
            onClick={() => onChange("")}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-subtle hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={placeholder}
          className="absolute z-50 mt-2 w-[19rem] rounded-xl border border-hairline bg-elevated p-3 shadow-bento"
        >
          {/* Navegación: mes anterior · selects mes/año · mes siguiente */}
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="grid h-8 w-7 shrink-0 place-items-center rounded-lg text-subtle hover:bg-hover hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-1 items-center gap-1.5">
              <div className="flex-1">
                <Select
                  value={String(month)}
                  onChange={(m) => setView(new Date(year, Number(m), 1))}
                  options={monthOptions}
                  aria-label="Mes"
                />
              </div>
              <div className="w-[5.25rem]">
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
              className="grid h-8 w-7 shrink-0 place-items-center rounded-lg text-subtle hover:bg-hover hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Cabecera de días */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-subtle">
            {WEEKDAYS_ES_MON.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Grilla */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={`e-${i}`} />;
              const d = new Date(year, month, day);
              const isSel = selected ? isSameLocalDay(d, selected) : false;
              const isToday = isSameLocalDay(d, today);
              const off = dayDisabled(d);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={off}
                  aria-pressed={isSel}
                  aria-label={`${day} de ${MONTHS_ES[month]} de ${year}`}
                  onClick={() => pickDay(d)}
                  className={cn(
                    "h-8 rounded-lg text-sm tabular-nums transition-colors",
                    off && "cursor-not-allowed text-subtle/40",
                    !off && isSel && "bg-brand font-semibold text-white",
                    !off && !isSel && "text-ink hover:bg-hover",
                    !off && !isSel && isToday && "ring-1 ring-brand/50",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Hora */}
          {showTime && (
            <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
              <Clock className="h-4 w-4 text-subtle" />
              <div className="w-20">
                <Select
                  value={hh}
                  onChange={(h) => setTime(h, mm)}
                  options={HOURS}
                  aria-label="Hora"
                />
              </div>
              <span className="text-subtle">:</span>
              <div className="w-20">
                <Select
                  value={mm}
                  onChange={(m) => setTime(hh, m)}
                  options={MINUTES}
                  aria-label="Minutos"
                />
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="mt-3 flex items-center justify-between">
            {allowClear ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  close();
                }}
                className="text-sm text-subtle hover:text-ink"
              >
                Limpiar
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={dayDisabled(new Date())}
              onClick={() => {
                const now = new Date();
                // Respeta min/max: si hoy está fuera de rango, el atajo no aplica.
                if (dayDisabled(now)) return;
                onChange(
                  showTime
                    ? `${dateToLocalDate(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`
                    : dateToLocalDate(now),
                );
                close();
              }}
              className={cn(
                "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong",
                dayDisabled(new Date()) &&
                  "opacity-50 cursor-not-allowed hover:bg-brand",
              )}
            >
              {showTime ? "Ahora" : "Hoy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
