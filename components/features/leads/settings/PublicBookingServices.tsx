"use client";

import Link from "next/link";
import { Alert, AlertDescription, Button, Checkbox, Label, Skeleton, StatusBadge } from "@/components/ui";
import { MultiSelect } from "@/components/ui/controls/multi-select";
import {
  PUBLIC_BOOKING_NO_DURATION_NOTE,
  PUBLIC_BOOKING_UNAVAILABLE_LABEL,
  formatBookingMinutes,
  setBookingServiceDoctors,
  toggleBookingService,
} from "@/lib/entity/leads";
import type { LeadPublicBookingForm } from "@/lib/hooks/leads";
import { leadErrorMessage } from "@/lib/services/leads";

const SERVICES_CATALOG_ROUTE = "/settings/services";
const ANY_DOCTOR_LABEL = "Cualquier doctor habilitado";

/** Servicios que el público puede reservar y quién atiende cada uno. */
export function PublicBookingServices({ form }: { form: LeadPublicBookingForm }) {
  const { values, change, readOnly, services, doctors, problems, unavailableServiceIds } = form;
  const options = services.data ?? [];
  const selected = new Map(values.services.map((service) => [service.serviceId, service]));
  const enabledDoctors = new Set(values.doctorIds);
  const doctorOptions = (doctors.data ?? [])
    .filter((doctor) => enabledDoctors.has(doctor.id))
    .map((doctor) => ({ value: doctor.id, label: doctor.name }));
  const knownDoctors = new Set(doctorOptions.map((option) => option.value));

  return (
    <section className="bento space-y-4 p-5" aria-labelledby="booking-services-title">
      <div className="space-y-1">
        <h2 id="booking-services-title" className="text-lg font-semibold text-ink">
          Servicios que se pueden reservar
        </h2>
        <p className="text-sm text-subtle">La duración del servicio define cuánto dura la cita.</p>
      </div>

      {services.isPending && (
        <div className="space-y-2" aria-label="Cargando servicios">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {services.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>No se pudieron cargar los servicios. {leadErrorMessage(services.error, "")}</span>
            <Button variant="outline" size="sm" onClick={() => void services.refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {services.isSuccess && options.length === 0 && unavailableServiceIds.length === 0 && (
        <p className="text-sm text-subtle">
          No hay servicios activos.{" "}
          <Link href={SERVICES_CATALOG_ROUTE} className="font-medium text-brand underline-offset-2 hover:underline">
            Ir al catálogo
          </Link>
        </p>
      )}

      {(options.length > 0 || unavailableServiceIds.length > 0) && (
        <ul className="space-y-2">
          {options.map((service) => {
            const bookable = service.duration !== null;
            const current = bookable ? selected.get(service.id) : undefined;
            const checkboxId = `booking-service-${service.id}`;
            const whoId = `booking-service-who-${service.id}`;
            const problem = problems.services[service.id];
            return (
              <li key={service.id} className="rounded-xl border border-hairline p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={checkboxId}
                    className="mt-0.5"
                    checked={!!current}
                    onCheckedChange={(checked) => change(toggleBookingService(values, service.id, checked === true))}
                    disabled={readOnly || !bookable}
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={checkboxId} className={bookable ? "cursor-pointer text-sm font-medium text-ink" : "text-sm font-medium text-subtle"}>
                      {service.name}
                    </Label>
                    {bookable ? (
                      <p className="text-xs text-subtle">{formatBookingMinutes(service.duration as number)}</p>
                    ) : (
                      <p className="text-xs text-subtle">
                        {PUBLIC_BOOKING_NO_DURATION_NOTE}.{" "}
                        <Link
                          href={SERVICES_CATALOG_ROUTE}
                          className="font-medium text-brand underline-offset-2 hover:underline"
                        >
                          Ir al catálogo
                        </Link>
                      </p>
                    )}
                  </div>
                </div>

                {current && (
                  <div className="mt-3 space-y-1.5 pl-7">
                    <Label htmlFor={whoId} className="text-xs text-subtle">
                      ¿Quién lo atiende?
                    </Label>
                    <MultiSelect
                      id={whoId}
                      aria-label={`¿Quién atiende ${service.name}?`}
                      aria-invalid={!!problem}
                      value={current.doctorIds.filter((id) => knownDoctors.has(id))}
                      onChange={(doctorIds) => change(setBookingServiceDoctors(values, service.id, doctorIds))}
                      options={doctorOptions}
                      placeholder={ANY_DOCTOR_LABEL}
                      searchPlaceholder="Buscar doctor…"
                      disabled={readOnly || doctorOptions.length === 0}
                    />
                    {problem ? (
                      <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
                        {problem}
                      </p>
                    ) : (
                      <p className="text-xs text-subtle">
                        {current.doctorIds.length === 0
                          ? `${ANY_DOCTOR_LABEL}. Elige doctores solo si quieres limitarlo.`
                          : "Solo los doctores elegidos atienden este servicio en línea."}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {unavailableServiceIds.map((id) => (
            <li key={id} className="flex items-center gap-3 rounded-xl border border-dashed border-hairline p-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">Servicio guardado</span>
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
