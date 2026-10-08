"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs, { type Dayjs } from "dayjs";
import type { BookLeadRequest, Lead, LeadConversionResult } from "@/lib/entity/leads";
import { leadBookingSchema, type LeadBookingValues } from "@/lib/entity/leads/schemas";
import { useClinicGeneralSettings } from "@/lib/hooks/settings/use-clinic-general-settings";
import {
  hasLeadErrorCode,
  isLeadApiError,
  isLeadModuleDisabledError,
  leadErrorMessage,
  type LeadApiError,
} from "@/lib/services/leads";
import { buildDisabledDate, isDoctorWorkingDay } from "@/lib/utils/appointment-utils";
import { useLeadAvailability, useLeadDoctorSchedule } from "./use-lead-catalogs";
import { useBookLead } from "./use-lead-mutations";

/** Duración con la que se consultan los huecos cuando se deja la estándar de la clínica. */
const AVAILABILITY_FALLBACK_DURATION = 30;

export type LeadBookingErrorKind = "agenda" | "already-converted" | "match-unresolved" | "other";

export interface LeadBookingError {
  kind: LeadBookingErrorKind;
  message: string;
}

/** Cuerpo de `POST /leads/{id}/book` a partir del formulario. */
export function buildBookLeadRequest(values: LeadBookingValues): BookLeadRequest {
  return {
    doctorId: values.doctorId,
    date: values.date,
    time: values.time,
    // Vacío = duración estándar de la clínica: no se envía.
    ...(values.duration ? { duration: Number(values.duration) } : {}),
    type: values.type,
    ...(values.notes ? { notes: values.notes } : {}),
    ...(values.serviceIds.length ? { serviceIds: values.serviceIds } : {}),
    ...(values.fullName ? { fullName: values.fullName } : {}),
    ...(values.existingPatientId ? { existingPatientId: values.existingPatientId } : {}),
  };
}

/**
 * Rechazo de la agenda en `POST /leads/{id}/book`: se reconoce porque NO trae `errorCode`, no
 * por el número de estado. Llega como 400 (horario ocupado, fuera de horario, en el pasado),
 * 404 (el doctor o un servicio no existe) o 422 (faltan datos de la cita) y en ningún caso
 * queda nada creado. Se excluyen 401/403 (sesión y permiso) y lo que no es una respuesta de
 * rechazo del backend (sin conexión, 5xx): ahí no se puede afirmar que no se creó nada.
 */
export function isAgendaRejection(error: unknown): error is LeadApiError {
  if (!isLeadApiError(error) || error.errorCode) return false;
  const { status } = error;
  return status !== undefined && status >= 400 && status < 500 && status !== 401 && status !== 403;
}

export function classifyBookingError(error: unknown): LeadBookingError {
  if (hasLeadErrorCode(error, "LEAD_ALREADY_CONVERTED")) {
    return {
      kind: "already-converted",
      message: "Este prospecto ya fue convertido. Para cambiar el horario, reagenda la cita desde la agenda.",
    };
  }
  if (hasLeadErrorCode(error, "LEAD_PATIENT_MATCH_UNRESOLVED")) {
    return {
      kind: "match-unresolved",
      message: "Primero hay que resolver si este prospecto es un paciente existente.",
    };
  }
  if (isAgendaRejection(error)) return { kind: "agenda", message: error.message };
  return { kind: "other", message: leadErrorMessage(error) };
}

interface UseLeadBookingFormOptions {
  open: boolean;
  lead: Lead;
  /** Reservar para un paciente que ya existe (cierra el prospecto como "Ya era paciente"). */
  existingPatientId?: string;
}

/**
 * Reserva de la primera cita: UNA sola llamada. El backend crea o enlaza el paciente, crea la
 * cita y convierte el prospecto; aquí no se llama a crear paciente ni a crear cita. Reintentar
 * es seguro (la misma petición devuelve la misma cita con `replayed: true`).
 */
export function useLeadBookingForm({ open, lead, existingPatientId }: UseLeadBookingFormOptions) {
  const requireName = !lead.fullName?.trim() && !existingPatientId;
  const schema = useMemo(() => leadBookingSchema({ requireName }), [requireName]);
  const book = useBookLead();
  const [result, setResult] = useState<LeadConversionResult | null>(null);
  const [error, setError] = useState<LeadBookingError | null>(null);

  const defaults = (): LeadBookingValues => ({
    doctorId: "",
    date: "",
    time: "",
    duration: "",
    type: "consultation",
    notes: "",
    serviceIds: lead.interestServiceId ? [lead.interestServiceId] : [],
    fullName: lead.fullName ?? "",
    existingPatientId: existingPatientId ?? "",
  });

  const form = useForm<LeadBookingValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaults());
    setResult(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead.id, existingPatientId]);

  const doctorId = form.watch("doctorId");
  const date = form.watch("date");
  const duration = form.watch("duration");

  const { rawSchedule: clinicSchedule } = useClinicGeneralSettings();
  const doctorSchedule = useLeadDoctorSchedule(doctorId || undefined).data ?? null;
  const availability = useLeadAvailability(
    doctorId || undefined,
    date || undefined,
    Number(duration) || AVAILABILITY_FALLBACK_DURATION,
  );

  const disabledDate = useMemo(
    () => buildDisabledDate(doctorSchedule, clinicSchedule),
    [doctorSchedule, clinicSchedule],
  );
  const isWorkingDay = (day: Dayjs) => isDoctorWorkingDay(doctorSchedule, day, clinicSchedule);
  const selectedDayWorked = date ? isDoctorWorkingDay(doctorSchedule, dayjs(date), clinicSchedule) : undefined;

  // Al cambiar doctor, fecha o duración la hora elegida deja de ser válida.
  useEffect(() => {
    form.setValue("time", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, date, duration]);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      setResult(await book.mutateAsync({ id: lead.id, data: buildBookLeadRequest(values) }));
    } catch (err) {
      if (isLeadModuleDisabledError(err)) return;
      const classified = classifyBookingError(err);
      setError(classified);
      if (classified.kind === "agenda") {
        // El hueco ya no está libre: se vuelve a consultar y se deja elegir otro.
        form.setValue("time", "");
        void availability.refetch();
      }
    }
  });

  return {
    form,
    submit,
    submitting: book.isPending,
    result,
    error,
    requireName,
    scheduleReady: !!doctorId && !!date,
    availableTimes: availability.data ?? [],
    availabilityLoading: availability.isFetching,
    disabledDate,
    isWorkingDay,
    selectedDayWorked,
  };
}
