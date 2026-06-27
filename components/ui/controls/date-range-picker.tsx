"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import { Select } from "@/components/ui/controls/select";

export type RangeGranularity = "day" | "week" | "month";

export interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  showTime?: boolean;
  granularity?: RangeGranularity;
  onGranularityChange?: (g: RangeGranularity) => void;
  disabled?: boolean;
  className?: string;
}

const GRANULARITY_OPTIONS = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

/**
 * DateRangePicker corporativo: compone dos DateTimePicker con restricción
 * cruzada (Desde.max = to, Hasta.min = from) y un selector de granularidad
 * opcional. No reinventa el calendario.
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  showTime = false,
  granularity,
  onGranularityChange,
  disabled = false,
  className,
}: DateRangePickerProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-hairline bg-surface p-1.5",
        className,
      )}
    >
      <div className="w-40">
        <DateTimePicker
          value={from}
          onChange={(v) => onChange({ from: v, to })}
          showTime={showTime}
          max={to || undefined}
          disabled={disabled}
          aria-label="Desde"
        />
      </div>
      <span className="px-0.5 text-sm text-subtle">–</span>
      <div className="w-40">
        <DateTimePicker
          value={to}
          onChange={(v) => onChange({ from, to: v })}
          showTime={showTime}
          min={from || undefined}
          disabled={disabled}
          aria-label="Hasta"
        />
      </div>

      {onGranularityChange && (
        <div className="w-32">
          <Select
            value={granularity ?? "day"}
            onChange={(g) => onGranularityChange(g as RangeGranularity)}
            options={GRANULARITY_OPTIONS}
            aria-label="Granularidad"
          />
        </div>
      )}
    </div>
  );
}
