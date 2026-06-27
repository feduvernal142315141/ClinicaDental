"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { SchedulerDoctorOption } from "@/lib/entity/appointment";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Checkbox } from "@/components/ui/atomic/forms";
import { SearchInput } from "@/components/ui/atomic/forms/search-input";
import { LabelChip } from "@/components/app/labels";
import { useLabels } from "@/lib/hooks/labels";
import { cn } from "@/lib/utils/utils";

interface AppointmentsSpecialistSidebarProps {
  doctors: SchedulerDoctorOption[];
  visibleDoctorIds: Set<string>;
  onToggleDoctor: (doctorId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onNewAppointment: () => void;
  canCreate: boolean;
  loading?: boolean;
  selectedLabelIds: Set<string>;
  onToggleLabel: (labelId: string) => void;
  onClearLabels: () => void;
}

function LabelFilterSection({
  selectedLabelIds,
  onToggle,
  onClear,
}: {
  selectedLabelIds: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const { labels, loading } = useLabels(false);
  const activeLabels = labels.filter((l) => !l.isArchived);

  if (loading || activeLabels.length === 0) return null;

  return (
    <div className="mt-1 border-t border-hairline pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
          Etiquetas
        </span>
        {selectedLabelIds.size > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onClear}
            className="h-auto px-1 py-0 text-[11px]"
          >
            Limpiar
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {activeLabels.map((label) => {
          const isSelected = selectedLabelIds.has(label.id);
          return (
            <span
              key={label.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onToggle(label.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(label.id);
                }
              }}
              className={cn(
                "cursor-pointer rounded-full outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-brand/40",
                isSelected ? "opacity-100" : "opacity-45 hover:opacity-75",
              )}
            >
              <LabelChip label={label} size="sm" />
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function AppointmentsSpecialistSidebar({
  doctors,
  visibleDoctorIds,
  onToggleDoctor,
  onSelectAll,
  onClearAll,
  onNewAppointment,
  canCreate,
  loading,
  selectedLabelIds,
  onToggleLabel,
  onClearLabels,
}: AppointmentsSpecialistSidebarProps) {
  // Buscador en cliente: pura presentación, no añade datos ni fetch.
  const [query, setQuery] = useState("");

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.specialty?.toLowerCase().includes(q) ?? false),
    );
  }, [doctors, query]);

  // Leyenda: especialistas actualmente visibles en el grid combinado
  // (independiente del buscador, refleja siempre lo que se pinta).
  const legendDoctors = useMemo(
    () => doctors.filter((d) => visibleDoctorIds.has(d.id)),
    [doctors, visibleDoctorIds],
  );

  return (
    <aside className="bento flex h-full flex-col gap-3 p-4">
      {/* CTA */}
      {canCreate && (
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={onNewAppointment}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva cita
        </Button>
      )}

      {/* Encabezado + acciones masivas */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
          Especialistas
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onSelectAll}
            className="h-auto px-1 py-0 text-[11px]"
          >
            Ver todos
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onClearAll}
            className="h-auto px-1 py-0 text-[11px]"
          >
            Limpiar
          </Button>
        </div>
      </div>

      {/* Buscador (cliente) */}
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar especialista..."
        aria-label="Buscar especialista"
      />

      {/* Lista de especialistas */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {loading &&
          doctors.length === 0 &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-11 animate-pulse rounded-lg bg-hover"
            />
          ))}

        {filteredDoctors.map((doctor) => {
          const checked = visibleDoctorIds.has(doctor.id);
          return (
            <div
              key={doctor.id}
              role="button"
              tabIndex={0}
              aria-pressed={checked}
              onClick={() => onToggleDoctor(doctor.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleDoctor(doctor.id);
                }
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
                checked ? "opacity-100" : "opacity-50 hover:bg-hover hover:opacity-90",
              )}
              style={
                checked
                  ? {
                      // doctorColor = color de DATO: acento (tinte + borde izq), no token de marca
                      backgroundColor: `${doctor.color}14`,
                      boxShadow: `inset 3px 0 0 ${doctor.color}`,
                    }
                  : undefined
              }
            >
              <Checkbox
                checked={checked}
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none"
              />
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                style={{ backgroundColor: doctor.color }}
              >
                {doctor.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                  {doctor.name}
                </p>
                {doctor.specialty && (
                  <p className="truncate text-[11px] leading-tight text-subtle">
                    {doctor.specialty}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {!loading && doctors.length === 0 && (
          <p className="mt-6 text-center text-sm text-subtle">
            No hay especialistas registrados
          </p>
        )}

        {!loading && doctors.length > 0 && filteredDoctors.length === 0 && (
          <p className="mt-6 text-center text-sm text-subtle">
            Sin coincidencias para “{query.trim()}”
          </p>
        )}
      </div>

      {/* Leyenda: punto de color → nombre (descifra el grid combinado) */}
      {legendDoctors.length > 0 && (
        <div className="border-t border-hairline pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
            Leyenda
          </p>
          <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
            {legendDoctors.map((doctor) => (
              <div key={doctor.id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: doctor.color }}
                />
                <span className="truncate text-[12px] text-ink">
                  {doctor.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por etiquetas */}
      <LabelFilterSection
        selectedLabelIds={selectedLabelIds}
        onToggle={onToggleLabel}
        onClear={onClearLabels}
      />
    </aside>
  );
}
