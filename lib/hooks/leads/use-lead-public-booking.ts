"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EMPTY_PUBLIC_BOOKING_FORM,
  buildPublicBookingRequest,
  hasPublicBookingProblems,
  prunePublicBookingValues,
  publicBookingFormSchema,
  publicBookingFormValues,
  publicBookingProblems,
  samePublicBookingValues,
  type LeadPublicBookingSettings,
  type PublicBookingCatalog,
  type PublicBookingFormValues,
  type UpdateLeadPublicBookingSettingsRequest,
} from "@/lib/entity/leads";
import { servicesQuery } from "@/lib/query/domains/services";
import { doctorsService } from "@/lib/services/doctors";
import {
  hasLeadErrorCode,
  isLeadApiError,
  isLeadModuleDisabledError,
  leadErrorMessage,
  leadsService,
} from "@/lib/services/leads";
import { servicesService } from "@/lib/services/services";
import { notify } from "@/lib/utils/notify";
import { leadCatalogKeys, leadKeys } from "./lead-query-keys";
import { useLeadPermissions } from "./use-lead-permissions";

export interface PublicBookingDoctorOption {
  id: string;
  name: string;
  specialty?: string;
}

export interface PublicBookingServiceOption {
  id: string;
  name: string;
  /** Minutos; `null` si el servicio no tiene duración y por eso no se puede ofrecer en línea. */
  duration: number | null;
}

/** Usuarios activos que atienden citas (lo resuelve el backend con `onlyProviders`), igual que la agenda. */
export function usePublicBookingDoctors() {
  return useQuery({
    queryKey: leadCatalogKeys.bookingDoctors,
    queryFn: async (): Promise<PublicBookingDoctorOption[]> => {
      const page = await doctorsService.getDoctors({ page: 0, pageSize: 100, onlyProviders: true });
      return (page.entities ?? [])
        .filter((doctor) => doctor.active !== false)
        .map((doctor) => ({ id: doctor.id, name: doctor.name, specialty: doctor.specialty || undefined }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
    },
    staleTime: 60_000,
  });
}

/** Servicios activos del catálogo, con su duración. */
export function usePublicBookingServices() {
  return useQuery({
    queryKey: leadCatalogKeys.bookingServices,
    queryFn: async (): Promise<PublicBookingServiceOption[]> => {
      const { filters, orders } = servicesQuery().active(true).order("name", "asc").build();
      const page = await servicesService.getServices({ filters, orders, pageSize: 100 });
      return (page.entities ?? [])
        .filter((service) => service.active !== false)
        .map((service) => ({
          id: service.id,
          name: service.name,
          duration: service.duration && service.duration > 0 ? service.duration : null,
        }));
    },
    staleTime: 60_000,
  });
}

export function useLeadPublicBookingSettings() {
  return useQuery({
    queryKey: leadKeys.publicBookingSettings(),
    queryFn: () => leadsService.getPublicBookingSettings(),
    // La pantalla decide cuándo recargar: un refresco de fondo no debe pisar lo que se está editando.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
  });
}

/**
 * Formulario de "Reservas en línea".
 *
 * - Solo guarda con el botón: nada se envía al cambiar un control.
 * - Envía siempre la `version` cargada. Con `BOOKING_SETTINGS_VERSION_CONFLICT` no reintenta:
 *   avisa y el usuario decide recargar.
 * - Lo que ya no se puede ofrecer (doctor o servicio desactivado) se marca y se quita al guardar.
 */
export function useLeadPublicBookingForm() {
  const permissions = useLeadPermissions();
  const queryClient = useQueryClient();
  const settings = useLeadPublicBookingSettings();
  const doctors = usePublicBookingDoctors();
  const services = usePublicBookingServices();

  const [base, setBase] = useState<LeadPublicBookingSettings | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [reloading, setReloading] = useState(false);

  const form = useForm<PublicBookingFormValues>({
    resolver: zodResolver(publicBookingFormSchema),
    mode: "onBlur",
    defaultValues: EMPTY_PUBLIC_BOOKING_FORM,
  });
  const values = useWatch({ control: form.control }) as PublicBookingFormValues;

  const hasEdits = !!base && !samePublicBookingValues(values, publicBookingFormValues(base));
  const hasEditsRef = useRef(hasEdits);
  hasEditsRef.current = hasEdits;

  const adopt = (next: LeadPublicBookingSettings) => {
    setBase(next);
    form.reset(publicBookingFormValues(next));
    setServerError(null);
    setConflict(false);
  };

  // Primera carga (o datos más nuevos sin nada editado). Con cambios en curso no se pisa el formulario.
  useEffect(() => {
    if (!settings.data || settings.data === base) return;
    if (base && hasEditsRef.current) return;
    adopt(settings.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data]);

  const catalogReady = doctors.isSuccess && services.isSuccess;
  const catalog = useMemo<PublicBookingCatalog>(
    () => ({
      doctorIds: new Set((doctors.data ?? []).map((doctor) => doctor.id)),
      serviceIds: new Set((services.data ?? []).filter((service) => service.duration !== null).map((service) => service.id)),
    }),
    [doctors.data, services.data],
  );

  // Sin los catálogos no se sabe qué sigue disponible: no se quita nada (y tampoco se deja guardar).
  const pruned = catalogReady ? prunePublicBookingValues(values, catalog) : values;
  const unavailableDoctorIds = catalogReady ? values.doctorIds.filter((id) => !catalog.doctorIds.has(id)) : [];
  const knownServiceIds = new Set((services.data ?? []).map((service) => service.id));
  const unavailableServiceIds = catalogReady
    ? values.services.map((service) => service.serviceId).filter((id) => !knownServiceIds.has(id))
    : [];
  const hasUnavailable = catalogReady && !samePublicBookingValues(values, pruned);
  const problems = publicBookingProblems(values, pruned);

  const readOnly = !permissions.canManage || forbidden;

  const mutation = useMutation({
    mutationFn: (request: UpdateLeadPublicBookingSettingsRequest) => leadsService.updatePublicBookingSettings(request),
  });

  const fieldErrors = form.formState.errors;
  const hasErrors = hasPublicBookingProblems(problems) || Object.keys(fieldErrors).length > 0;
  const canSave =
    !readOnly && !!base && catalogReady && !conflict && !mutation.isPending && !hasErrors && (hasEdits || hasUnavailable);

  const submit = form.handleSubmit(async () => {
    if (!base || !catalogReady || readOnly || conflict || hasPublicBookingProblems(problems)) return;
    setServerError(null);
    try {
      const saved = await mutation.mutateAsync(buildPublicBookingRequest(pruned, base.version));
      queryClient.setQueryData(leadKeys.publicBookingSettings(), saved);
      adopt(saved);
      notify.success("Configuración guardada", {
        description: saved.enabled ? "Las reservas en línea quedaron activadas." : "Las reservas en línea quedaron desactivadas.",
      });
    } catch (error) {
      // El módulo apagado ya lo avisa la app y la puerta cambia la pantalla.
      if (isLeadModuleDisabledError(error)) return;
      if (hasLeadErrorCode(error, "BOOKING_SETTINGS_VERSION_CONFLICT")) {
        setConflict(true);
        return;
      }
      if (isLeadApiError(error) && error.kind === "forbidden") setForbidden(true);
      setServerError(leadErrorMessage(error));
    }
  });

  /** Vuelve a lo último guardado. */
  const discard = () => {
    if (!base) return;
    form.reset(publicBookingFormValues(base));
    setServerError(null);
  };

  /** Trae la versión actual del servidor y descarta lo editado (lo pide el usuario tras un conflicto). */
  const reload = async () => {
    setReloading(true);
    try {
      const fresh = await settings.refetch();
      if (fresh.data) adopt(fresh.data);
      else if (fresh.error && !isLeadModuleDisabledError(fresh.error)) {
        notify.error("No se pudo recargar la configuración", { description: leadErrorMessage(fresh.error) });
      }
    } finally {
      setReloading(false);
    }
  };

  /** Aplica un cambio de selección sobre los valores actuales. */
  const change = (next: PublicBookingFormValues) => {
    form.setValue("enabled", next.enabled, { shouldDirty: true });
    form.setValue("doctorIds", next.doctorIds, { shouldDirty: true });
    form.setValue("services", next.services, { shouldDirty: true });
    form.setValue("minAdvanceMinutes", next.minAdvanceMinutes, { shouldDirty: true, shouldValidate: true });
    form.setValue("maxAdvanceDays", next.maxAdvanceDays, { shouldDirty: true, shouldValidate: true });
    form.setValue("slotIntervalMinutes", next.slotIntervalMinutes, { shouldDirty: true, shouldValidate: true });
  };

  // Cerrar o recargar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!hasEdits) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasEdits]);

  return {
    /** Lo último guardado: de aquí sale el estado en el sitio web. */
    saved: base,
    values,
    change,
    fieldErrors,
    problems,
    serverError,
    conflict,
    readOnly,
    hasEdits,
    hasUnavailable,
    canSave,
    saving: mutation.isPending,
    reloading,
    submit,
    discard,
    reload,
    loading: settings.isPending,
    loadError: settings.isError && !base ? settings.error : null,
    retryLoad: () => void settings.refetch(),
    doctors,
    services,
    catalogReady,
    unavailableDoctorIds,
    unavailableServiceIds,
  };
}

export type LeadPublicBookingForm = ReturnType<typeof useLeadPublicBookingForm>;
