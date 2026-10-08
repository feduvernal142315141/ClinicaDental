"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { cn } from "@/lib/utils/utils";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import { useI18n } from "@/lib/contexts/i18n-context";
import type {
  SchedulerViewMode,
  SchedulerDateRange,
} from "@/lib/entity/appointment";

dayjs.locale("es");

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
  language: string,
): string {
  const formatDate = (
    date: string | Date,
    options: Intl.DateTimeFormatOptions,
  ) => new Intl.DateTimeFormat(language, options).format(new Date(date));

  switch (viewMode) {
    case "day":
      return formatDate(`${currentDate}T00:00:00`, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    case "week": {
      const start = dayjs(dateRange.start);
      const end = dayjs(dateRange.end);
      if (start.month() === end.month()) {
        return `${start.format("D")} – ${formatDate(`${dateRange.end}T00:00:00`, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`;
      }
      if (start.year() === end.year()) {
        return `${formatDate(`${dateRange.start}T00:00:00`, {
          day: "numeric",
          month: "short",
        })} – ${formatDate(`${dateRange.end}T00:00:00`, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;
      }
      return `${formatDate(`${dateRange.start}T00:00:00`, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })} – ${formatDate(`${dateRange.end}T00:00:00`, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    }
    case "month":
      return formatDate(`${currentDate}T00:00:00`, {
        month: "long",
        year: "numeric",
      });
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
  const { language, t } = useI18n();
  const rangeLabel = formatRangeLabel(viewMode, currentDate, dateRange, language);
  const viewOptions: { label: string; value: SchedulerViewMode }[] = [
    { label: t("appointments.view.day"), value: "day" },
    { label: t("appointments.view.week"), value: "week" },
    { label: t("appointments.view.month"), value: "month" },
  ];

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Izquierda: modo de vista (control segmentado Bento) */}
        <div
          role="group"
          aria-label={t("appointments.viewMode")}
          className="inline-flex items-center rounded-xl border border-hairline bg-elevated p-0.5 text-sm"
        >
          {viewOptions.map((opt) => {
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
            aria-label={t("appointments.previous")}
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
            {t("appointments.today")}
          </button>
          <button
            type="button"
            aria-label={t("appointments.next")}
            onClick={onNext}
            className="grid h-9 w-9 place-items-center rounded-xl border border-hairline bg-elevated text-subtle transition-colors hover:bg-hover hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Etiqueta de rango (solo la 1ª letra en mayúscula; `capitalize`
            ponía "De Junio De" — incorrecto en español). */}
        <span className="whitespace-nowrap text-[15px] font-semibold text-ink first-letter:uppercase">
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
          aria-label={t("appointments.goToDate")}
          className="ml-auto w-44"
          align="end"
        />
      </div>
    </div>
  );
}
