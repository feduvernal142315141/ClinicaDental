"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { cn } from "@/lib/utils/utils";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import type {
  SchedulerViewMode,
  SchedulerDateRange,
} from "@/lib/entity/appointment";

dayjs.locale("es");

const VIEW_OPTIONS: { label: string; value: SchedulerViewMode }[] = [
  { label: "Día", value: "day" },
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
];

interface AppointmentsSchedulerToolbarProps {
  viewMode: SchedulerViewMode;
  onViewModeChange: (mode: SchedulerViewMode) => void;
  currentDate: string;
  dateRange: SchedulerDateRange;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange: (date: string) => void;
}

function formatRangeLabel(
  viewMode: SchedulerViewMode,
  currentDate: string,
  dateRange: SchedulerDateRange,
): string {
  const ref = dayjs(currentDate);

  switch (viewMode) {
    case "day":
      return ref.format("dddd, D [de] MMMM [de] YYYY");
    case "week": {
      const start = dayjs(dateRange.start);
      const end = dayjs(dateRange.end);
      if (start.month() === end.month()) {
        return `${start.format("D")} – ${end.format("D [de] MMMM [de] YYYY")}`;
      }
      if (start.year() === end.year()) {
        return `${start.format("D [de] MMM")} – ${end.format("D [de] MMM [de] YYYY")}`;
      }
      return `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`;
    }
    case "month":
      return ref.format("MMMM [de] YYYY");
  }
}

export function AppointmentsSchedulerToolbar({
  viewMode,
  onViewModeChange,
  currentDate,
  dateRange,
  onPrev,
  onNext,
  onToday,
  onDateChange,
}: AppointmentsSchedulerToolbarProps) {
  const rangeLabel = formatRangeLabel(viewMode, currentDate, dateRange);

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Izquierda: modo de vista (control segmentado Bento) */}
        <div
          role="group"
          aria-label="Modo de vista"
          className="inline-flex items-center rounded-xl border border-hairline bg-elevated p-0.5 text-sm"
        >
          {VIEW_OPTIONS.map((opt) => {
            const isActive = opt.value === viewMode;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onViewModeChange(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-medium transition-colors",
                  isActive
                    ? "bg-brand text-white shadow-sm"
                    : "text-subtle hover:text-ink",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Centro: navegación ‹ Hoy › */}
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Anterior"
            onClick={onPrev}
            className="grid h-9 w-9 place-items-center rounded-xl border border-hairline bg-elevated text-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="h-9 rounded-xl border border-hairline bg-elevated px-3 text-sm font-medium text-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            Hoy
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={onNext}
            className="grid h-9 w-9 place-items-center rounded-xl border border-hairline bg-elevated text-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Etiqueta de rango */}
        <span className="whitespace-nowrap text-[15px] font-semibold capitalize text-ink">
          {rangeLabel}
        </span>

        {/* Selector de fecha (Bento, sin hora) */}
        <DateTimePicker
          value={currentDate}
          showTime={false}
          allowClear={false}
          onChange={(val) => {
            if (val) onDateChange(val);
          }}
          aria-label="Ir a una fecha"
          className="ml-auto w-44"
        />
      </div>
    </div>
  );
}
