"use client";

import { Alert, AlertDescription, Avatar, AvatarFallback, Button, Checkbox, Skeleton, StatusBadge } from "@/components/ui";
import {
  PUBLIC_BOOKING_UNAVAILABLE_LABEL,
  setBookingDoctors,
  toggleBookingDoctor,
} from "@/lib/entity/leads";
import type { LeadPublicBookingForm } from "@/lib/hooks/leads";
import { leadErrorMessage } from "@/lib/services/leads";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Doctores que el público puede elegir al reservar desde el sitio web. */
export function PublicBookingDoctors({ form }: { form: LeadPublicBookingForm }) {
  const { values, change, readOnly, doctors, unavailableDoctorIds } = form;
  const options = doctors.data ?? [];
  const selected = new Set(values.doctorIds);
  const selectedCount = options.filter((doctor) => selected.has(doctor.id)).length;
  const allSelected = options.length > 0 && selectedCount === options.length;

  const toggleAll = (checked: boolean) => {
    // Lo que ya no está disponible se conserva hasta guardar: no se quita por un clic en "todos".
    const next = checked ? [...unavailableDoctorIds, ...options.map((doctor) => doctor.id)] : unavailableDoctorIds;
    change(setBookingDoctors(values, next));
  };

  return (
    <section className="bento space-y-4 p-5" aria-labelledby="booking-doctors-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="booking-doctors-title" className="text-lg font-semibold text-ink">
            Doctores que atienden en línea
          </h2>
          <p className="text-sm text-subtle">Solo estos doctores aparecen en tu sitio web.</p>
        </div>
        {options.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <Checkbox
              checked={allSelected ? true : selectedCount > 0 ? "indeterminate" : false}
              onCheckedChange={(checked) => toggleAll(checked === true)}
              disabled={readOnly}
            />
            Seleccionar todos
          </label>
        )}
      </div>

      {doctors.isPending && (
        <div className="space-y-2" aria-label="Cargando doctores">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {doctors.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>No se pudieron cargar los doctores. {leadErrorMessage(doctors.error, "")}</span>
            <Button variant="outline" size="sm" onClick={() => void doctors.refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {doctors.isSuccess && options.length === 0 && unavailableDoctorIds.length === 0 && (
        <p className="text-sm text-subtle">No hay usuarios activos que atiendan citas en esta clínica.</p>
      )}

      {(options.length > 0 || unavailableDoctorIds.length > 0) && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {options.map((doctor) => (
            <li key={doctor.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline p-3 transition-colors hover:bg-hover has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40">
                <Checkbox
                  checked={selected.has(doctor.id)}
                  onCheckedChange={(checked) => change(toggleBookingDoctor(values, doctor.id, checked === true))}
                  disabled={readOnly}
                />
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-hover text-xs font-semibold text-ink">{initials(doctor.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{doctor.name}</span>
                  {doctor.specialty && <span className="block truncate text-xs text-subtle">{doctor.specialty}</span>}
                </span>
              </label>
            </li>
          ))}
          {unavailableDoctorIds.map((id) => (
            <li key={id} className="flex items-center gap-3 rounded-xl border border-dashed border-hairline p-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">Doctor guardado</span>
                <span className="block text-xs text-subtle">Se quitará al guardar.</span>
              </span>
              <StatusBadge tone="warning">{PUBLIC_BOOKING_UNAVAILABLE_LABEL}</StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
