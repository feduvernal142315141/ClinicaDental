import { useCallback, useEffect, useState } from "react";

import { isSessionExpired } from "@/lib/services/apiConfig";
import { clinicGeneralSettingsService } from "@/lib/services/settings";
import type {
  ClinicGeneralSettings,
  ClinicSchedule,
  ClinicScheduleDay,
  UpdateClinicGeneralSettingsRequest,
} from "@/lib/entity/settings";
import {
  CLINIC_SCHEDULE_DAYS,
  DEFAULT_CLINIC_GENERAL_SETTINGS,
  DEFAULT_CLINIC_SCHEDULE,
} from "@/lib/entity/settings";
import { notify } from "@/lib/utils/notify";

function normalizeSchedule(schedule?: Partial<ClinicSchedule> | null): ClinicSchedule {
  const normalized = { ...DEFAULT_CLINIC_SCHEDULE };

  for (const { key } of CLINIC_SCHEDULE_DAYS) {
    const value = schedule?.[key] as ClinicScheduleDay | undefined;
    if (!value) continue;

    normalized[key] = {
      enabled: Boolean(value.enabled),
      startTime: value.startTime ?? null,
      endTime: value.endTime ?? null,
    };
  }

  return normalized;
}

function normalizeSettings(settings: ClinicGeneralSettings): ClinicGeneralSettings {
  return {
    ...DEFAULT_CLINIC_GENERAL_SETTINGS,
    ...settings,
    schedule: normalizeSchedule(settings.schedule),
  };
}

export function useClinicGeneralSettings() {
  const [settings, setSettings] = useState<ClinicGeneralSettings | null>(null);
  // Horario TAL CUAL lo devolvió el backend (parcial: los días que la clínica
  // nunca configuró están AUSENTES, no rellenados con defaults). Es la fuente
  // correcta para acotar el horario del doctor: un día ausente ⇒ sin regla,
  // en paridad con el backend (DoctorClinicScheduleBoundsChecker trata
  // `clinicByDay.get(day) == null` como permisivo). NO usar `settings.schedule`
  // para eso: ese está normalizado con DEFAULT_CLINIC_SCHEDULE para el editor
  // de Opciones Generales y fabricaría límites (Lun–Vie 08:00–17:00) que el
  // backend no impone, produciendo falsos-rojos en el form de doctor.
  const [rawSchedule, setRawSchedule] =
    useState<Partial<ClinicSchedule> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await clinicGeneralSettingsService.getGeneralSettings();
      setRawSchedule(data.schedule ?? null);
      setSettings(normalizeSettings(data));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al cargar la configuración general";
      setError(errorMessage);
      // Si la sesión expiró, el modal global ya lo informa: no duplicar toast.
      if (!isSessionExpired()) {
        notify.error(errorMessage, {
          description:
            "No pudimos cargar la configuración de la clínica. Revisa tu conexión y vuelve a intentarlo; si el problema sigue, contacta a soporte.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(
    async (payload: UpdateClinicGeneralSettingsRequest) => {
      setSaving(true);
      setError(null);

      try {
        await clinicGeneralSettingsService.updateGeneralSettings(payload);
        // El payload del editor lleva los 7 días explícitos ⇒ es el nuevo
        // horario "crudo" configurado por la clínica.
        setRawSchedule(payload.schedule ?? null);
        setSettings((current) =>
          current ? normalizeSettings({ ...current, ...payload }) : current,
        );
        notify.success("Configuración guardada", {
          description:
            "Los datos generales de la clínica se actualizaron y ya están vigentes en todo el sistema.",
        });
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Error al guardar la configuración general";
        setError(errorMessage);
        notify.error(errorMessage, {
          description:
            "No se guardaron los cambios de la configuración. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return {
    settings,
    rawSchedule,
    loading,
    saving,
    error,
    reload: loadSettings,
    saveSettings,
  };
}
