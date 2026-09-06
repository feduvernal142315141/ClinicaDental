"use client";

import { useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/controls/select";
import { cn } from "@/lib/utils/utils";

export interface EvolutionFilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** Años presentes en el historial, descendente. */
  years: number[];
  /** `null` = todos los años. */
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
  /** Doctores presentes en el historial. Con uno solo no se ofrece el filtro. */
  doctors: string[];
  selectedDoctor: string | null;
  onDoctorChange: (doctor: string | null) => void;
  /** Consultas que sobreviven al filtro. */
  resultCount: number;
  /** Consultas totales antes de filtrar. */
  totalCount: number;
  onClear: () => void;
}

const ALL_DOCTORS = "__all__";

/**
 * Búsqueda y filtros del historial de evolución.
 *
 * QUÉ SE BUSCA, Y POR QUÉ NO MÁS: el filtro corre sobre los datos de la CITA
 * —motivo, servicio, tipo, doctor y fecha—, que llegan completos en la lista.
 * NO busca dentro del texto de las notas ni de los diagnósticos, aunque parezca
 * lo natural: esos viven en el registro de cada visita, que se carga
 * perezosamente (una petición por tarjeta). Buscar ahí devolvería resultados
 * distintos según cuánto hubieras desplazado la página, y una búsqueda que se
 * salta consultas sin decirlo, en una historia clínica, es peor que no tenerla.
 *
 * NOTA sobre los nombres: llegan del backend tal cual estén guardados, a veces
 * en mayúsculas. NO se normalizan — reescribir el nombre de un profesional en un
 * registro clínico no es cosa de la vista, y capitalizar automáticamente rompe
 * apellidos legítimos (D'Souza, McDonald, de la Cruz). Se acota su peso visual
 * con tamaño y truncado, no tocando el dato.
 */
export function EvolutionFilterBar({
  query,
  onQueryChange,
  years,
  selectedYear,
  onYearChange,
  doctors,
  selectedDoctor,
  onDoctorChange,
  resultCount,
  totalCount,
  onClear,
}: EvolutionFilterBarProps) {
  const hasFilters =
    query.trim().length > 0 || selectedYear !== null || selectedDoctor !== null;

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
      {/* ── Fila principal: buscador + profesional ────────────────────────
          Una sola fila desde `sm`. El buscador se lleva el espacio libre y el
          selector queda acotado: es un filtro secundario y a ancho completo
          pesaba más que la búsqueda, que es la acción principal. */}
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
            placeholder="Buscar por tratamiento, doctor o motivo…"
            aria-label="Buscar en el historial de consultas"
            className={cn(
              "h-9 w-full rounded-lg bg-hover pl-9 pr-3 text-sm text-ink",
              "ring-1 ring-transparent transition-shadow",
              "placeholder:text-subtle focus-visible:outline-none",
              "focus-visible:bg-surface focus-visible:ring-brand/40",
              // El nativo pinta su propia X de "search" en algunos navegadores,
              // encima de la nuestra y con otro estilo.
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

      {/* ── Años ─────────────────────────────────────────────────────────
          Los años son el filtro que más se usa en un historial largo, así que
          van a la vista y no escondidos en un desplegable. */}
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

      {/* ── Estado del filtro ────────────────────────────────────────────
          El recuento aparece SIEMPRE que haya filtro, incluso con 0 resultados:
          sin él, un filtro olvidado hace que el historial parezca más corto de
          lo que es. */}
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
                · se busca en motivo, servicio, doctor y fecha
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
