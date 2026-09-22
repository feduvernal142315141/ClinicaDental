"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Search, SlidersHorizontal, X } from "lucide-react";
import { DateRangePicker } from "@/components/ui/controls/date-range-picker";
import { Select, type SelectOption } from "@/components/ui/controls/select";
import { cn } from "@/lib/utils/utils";

export interface EvolutionFilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  years: number[];
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
  doctors: string[];
  selectedDoctor: string | null;
  onDoctorChange: (doctor: string | null) => void;
  dateFrom: string;
  dateTo: string;
  onDateRangeChange: (range: { from: string; to: string }) => void;
  resultCount: number;
  totalCount: number;
  onClear: () => void;
}

const ALL_DOCTORS = "__all__";

export function EvolutionFilterBar({
  query,
  onQueryChange,
  years,
  selectedYear,
  onYearChange,
  doctors,
  selectedDoctor,
  onDoctorChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  resultCount,
  totalCount,
  onClear,
}: EvolutionFilterBarProps) {
  const hasDateRange = dateFrom !== "" || dateTo !== "";
  const [showDateRange, setShowDateRange] = useState(hasDateRange);
  const hasFilters =
    query.trim().length > 0 ||
    selectedYear !== null ||
    selectedDoctor !== null ||
    hasDateRange;
  const doctorOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_DOCTORS, label: "Todos los profesionales" },
      ...doctors.map((doctor) => ({ value: doctor, label: doctor })),
    ],
    [doctors],
  );
  const showDoctorFilter = doctors.length > 1;
  const showYearFilter = years.length > 1;
  return (
    <section className="bento mb-3 px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por fecha, servicio, doctor o notas de la cita…"
            aria-label="Buscar en el historial de consultas"
            className={cn(
              "h-9 w-full rounded-lg bg-hover pl-9 pr-3 text-sm text-ink",
              "ring-1 ring-transparent transition-shadow",
              "placeholder:text-subtle focus-visible:outline-none",
              "focus-visible:bg-surface focus-visible:ring-brand/40",
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
          />
        </div>

        {showDoctorFilter ? (
          <div className="w-full shrink-0 sm:w-56">
            <Select
              value={selectedDoctor ?? ALL_DOCTORS}
              onChange={(value) =>
                onDoctorChange(value === ALL_DOCTORS ? null : value)
              }
              options={doctorOptions}
              searchable={doctors.length > 8}
              searchPlaceholder="Buscar profesional…"
              aria-label="Filtrar por profesional"
              className="h-9 text-xs"
            />
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDateRange((open) => !open)}
          aria-expanded={showDateRange}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1",
            "text-xs font-medium ring-1 transition-colors focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-brand/40",
            hasDateRange
              ? "bg-brand/10 text-brand ring-brand/30"
              : "bg-hover text-subtle ring-hairline hover:text-ink",
          )}
        >
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          {hasDateRange ? "Rango activo" : "Rango de fechas"}
        </button>
        {showDateRange ? (
          <div className="w-full">
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={onDateRangeChange}
            />
          </div>
        ) : null}
      </div>
      {showYearFilter ? (
        <div
          className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5"
          role="group"
          aria-label="Filtrar por año"
        >
          <SlidersHorizontal
            className="h-3.5 w-3.5 shrink-0 text-subtle"
            aria-hidden="true"
          />
          <YearChip
            active={selectedYear === null}
            onClick={() => onYearChange(null)}
          >
            Todos
          </YearChip>
          {years.map((year) => (
            <YearChip
              key={year}
              active={selectedYear === year}
              onClick={() => onYearChange(selectedYear === year ? null : year)}
            >
              {year}
            </YearChip>
          ))}
        </div>
      ) : null}
      {hasFilters ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-hairline pt-2">
          <p className="min-w-0 text-xs text-subtle">
            {resultCount === 0 ? (
              "Ninguna consulta coincide"
            ) : (
              <>
                <span className="font-medium text-ink tabular-nums">
                  {resultCount}
                </span>{" "}
                de {totalCount} consultas
              </>
            )}
            {query.trim().length > 0 ? (
              <span className="hidden text-[11px] sm:inline">
                {" "}
                · se busca en fecha, servicio, tipo, doctor y notas de la cita;
                no en las notas de evolución ni en los diagnósticos
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={onClear}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5",
              "text-xs font-medium text-brand transition-colors hover:bg-brand/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
            )}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Limpiar
          </button>
        </div>
      ) : null}
    </section>
  );
}

function YearChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
        "ring-1 transition-colors focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-surface [@media(pointer:coarse)]:py-1.5",
        active
          ? "bg-brand text-white ring-brand"
          : "bg-hover text-subtle ring-hairline hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
export default EvolutionFilterBar;
