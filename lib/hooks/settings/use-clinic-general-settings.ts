import { useCallback, useEffect, useState } from "react";
import { App } from "antd";
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
  const { message } = App.useApp();
  const [settings, setSettings] = useState<ClinicGeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await clinicGeneralSettingsService.getGeneralSettings();
      setSettings(normalizeSettings(data));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al cargar la configuración general";
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(
    async (payload: UpdateClinicGeneralSettingsRequest) => {
      setSaving(true);
      setError(null);

      try {
        await clinicGeneralSettingsService.updateGeneralSettings(payload);
        setSettings((current) =>
          current ? normalizeSettings({ ...current, ...payload }) : current,
        );
        message.success("Configuración general guardada correctamente");
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Error al guardar la configuración general";
        setError(errorMessage);
        message.error(errorMessage);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [message],
  );

  return {
    settings,
    loading,
    saving,
    error,
    reload: loadSettings,
    saveSettings,
  };
}
