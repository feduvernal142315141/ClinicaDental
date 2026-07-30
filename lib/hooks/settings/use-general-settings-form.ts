"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useClinicGeneralSettings } from "@/lib/hooks/settings/use-clinic-general-settings";
import { useClinicBranding } from "@/lib/contexts/clinic-branding-context";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import {
  CLINIC_SCHEDULE_DAYS,
  DEFAULT_CLINIC_GENERAL_SETTINGS,
  DEFAULT_CLINIC_SCHEDULE,
  type ClinicSchedule,
  type UpdateClinicGeneralSettingsRequest,
} from "@/lib/entity/settings";
import {
  generalSettingsFormSchema,
  type GeneralSettingsFormValues,
} from "@/lib/hooks/settings/general-settings-form.schema";

/** Convierte el `schedule` normalizado del hook de datos (string|null) al
 * formato del form (string, "" = sin definir), que es lo que espera `TimeField`. */
function scheduleToFormValues(
  schedule: ClinicSchedule,
): GeneralSettingsFormValues["schedule"] {
  const result = {} as GeneralSettingsFormValues["schedule"];

  for (const { key } of CLINIC_SCHEDULE_DAYS) {
    const day = schedule[key];
    result[key] = {
      enabled: Boolean(day?.enabled),
      startTime: day?.startTime ?? "",
      endTime: day?.endTime ?? "",
    };
  }

  return result;
}

/** Inverso de `scheduleToFormValues`: fuerza null en días deshabilitados y
 * convierte "" -> null, tal como espera el contrato de guardado del backend. */
function scheduleToPayload(
  schedule: GeneralSettingsFormValues["schedule"],
): ClinicSchedule {
  const result = {} as ClinicSchedule;

  for (const { key } of CLINIC_SCHEDULE_DAYS) {
    const day = schedule[key];
    result[key] = day.enabled
      ? {
          enabled: true,
          startTime: day.startTime || null,
          endTime: day.endTime || null,
        }
      : { enabled: false, startTime: null, endTime: null };
  }

  return result;
}

/**
 * useGeneralSettingsForm — lógica de negocio del form de Opciones Generales.
 *
 * Envuelve `useClinicGeneralSettings` (datos: load/save/reload) con
 * react-hook-form + zod. Prefill vía `form.reset()` en `useEffect` cuando
 * llegan los datos (nunca calculado en render). Conserva el contrato exacto
 * de guardado (`UpdateClinicGeneralSettingsRequest`) del hook legacy.
 */
export function useGeneralSettingsForm() {
  const { settings, loading, saving, error, reload, saveSettings } =
    useClinicGeneralSettings();
  const { updateBranding } = useClinicBranding();
  const { can, isAdmin } = usePermission();

  const canEdit = isAdmin || can("general_option", PermissionAction.EDIT);

  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      address: null,
      phone: null,
      timezone: DEFAULT_CLINIC_GENERAL_SETTINGS.timezone,
      currency: DEFAULT_CLINIC_GENERAL_SETTINGS.currency,
      logoUrl: null,
      schedule: scheduleToFormValues(DEFAULT_CLINIC_SCHEDULE),
      minimumAdvanceNoticePeriod: 120,
      standardAppointmentDuration: 30,
      cancellationLimitPerMonth: 3,
      allowOnlineReservations: true,
      requireConfirmation: false,
      sendReminders: false,
      reminderTime: 1440,
    },
  });

  // Prefill: sólo cuando llegan datos del servidor (nunca en render).
  useEffect(() => {
    if (!settings) return;

    form.reset({
      name: settings.name,
      address: settings.address ?? null,
      phone: settings.phone ?? null,
      timezone: settings.timezone,
      currency: settings.currency,
      logoUrl: settings.logoUrl ?? null,
      schedule: scheduleToFormValues(settings.schedule),
      minimumAdvanceNoticePeriod: settings.minimumAdvanceNoticePeriod ?? 120,
      standardAppointmentDuration: settings.standardAppointmentDuration ?? 30,
      cancellationLimitPerMonth: settings.cancellationLimitPerMonth ?? 3,
      allowOnlineReservations: settings.allowOnlineReservations ?? true,
      requireConfirmation: settings.requireConfirmation ?? false,
      sendReminders: settings.sendReminders ?? false,
      reminderTime: settings.reminderTime ?? 1440,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleSubmit = useCallback(
    async (values: GeneralSettingsFormValues) => {
      const payload: UpdateClinicGeneralSettingsRequest = {
        name: values.name.trim(),
        address: values.address?.trim() || null,
        phone: values.phone?.trim() || null,
        timezone: values.timezone,
        currency: values.currency,
        logoUrl: values.logoUrl || null,
        schedule: scheduleToPayload(values.schedule),
        minimumAdvanceNoticePeriod: values.minimumAdvanceNoticePeriod ?? null,
        standardAppointmentDuration: values.standardAppointmentDuration,
        cancellationLimitPerMonth: values.cancellationLimitPerMonth ?? null,
        allowOnlineReservations: values.allowOnlineReservations,
        requireConfirmation: values.requireConfirmation,
        sendReminders: values.sendReminders,
        reminderTime: values.sendReminders ? values.reminderTime ?? null : null,
      };

      const saved = await saveSettings(payload);
      // Refleja nombre/logo en Sidebar y login de inmediato (sin esperar un
      // reload completo): el toast de éxito promete que ya están "vigentes
      // en todo el sistema", así que el contexto de marca debe enterarse.
      if (saved) {
        updateBranding({ name: payload.name, logoUrl: payload.logoUrl });
      }
    },
    [saveSettings, updateBranding],
  );

  return {
    form,
    settings,
    loading,
    saving,
    error,
    reload,
    canEdit,
    handleSubmit,
  };
}
