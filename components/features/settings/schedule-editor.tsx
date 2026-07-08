"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Switch,
} from "@/components/ui/atomic/forms";
import { TimeField } from "@/components/ui/controls/time-field";
import { CLINIC_SCHEDULE_DAYS } from "@/lib/entity/settings";
import type { ClinicScheduleDayKey } from "@/lib/entity/settings";
import type { GeneralSettingsFormValues } from "@/lib/hooks/settings";

interface ScheduleEditorProps {
  disabled?: boolean;
}

/**
 * ScheduleEditor — editor del horario semanal de la clínica (7 días).
 *
 * Debe renderizarse dentro del `<Form {...form}>` del padre (usa
 * `useFormContext<GeneralSettingsFormValues>`). La validación cruzada
 * (día habilitado requiere apertura/cierre coherentes) vive en
 * `generalSettingsFormSchema` y se muestra vía `FormMessage` sobre el
 * campo `startTime` del día correspondiente.
 */
export function ScheduleEditor({ disabled = false }: ScheduleEditorProps) {
  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[minmax(0,7rem)_auto_1fr_1fr] gap-3 px-4 text-xs font-medium text-subtle sm:grid">
        <span>Día</span>
        <span>Estado</span>
        <span>Apertura</span>
        <span>Cierre</span>
      </div>

      {CLINIC_SCHEDULE_DAYS.map(({ key, label }) => (
        <ScheduleDayRow key={key} dayKey={key} label={label} disabled={disabled} />
      ))}
    </div>
  );
}

function ScheduleDayRow({
  dayKey,
  label,
  disabled,
}: {
  dayKey: ClinicScheduleDayKey;
  label: string;
  disabled: boolean;
}) {
  const form = useFormContext<GeneralSettingsFormValues>();
  const enabled = form.watch(`schedule.${dayKey}.enabled`);
  const timesDisabled = disabled || !enabled;

  return (
    <div className="rounded-xl border border-hairline bg-hover p-4">
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,7rem)_auto_1fr_1fr] sm:items-center">
        <span className="text-sm font-semibold text-ink">{label}</span>

        <FormField
          control={form.control}
          name={`schedule.${dayKey}.enabled`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                  aria-label={`${label}: ${field.value ? "abierto" : "cerrado"}`}
                />
              </FormControl>
              <span className="text-xs text-subtle">
                {field.value ? "Abierto" : "Cerrado"}
              </span>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`schedule.${dayKey}.startTime`}
          render={({ field, fieldState }) => (
            <FormItem>
              <span className="text-xs text-subtle sm:hidden">Apertura</span>
              <TimeField
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={timesDisabled}
                aria-label={`${label}: hora de apertura`}
                aria-invalid={!!fieldState.error}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`schedule.${dayKey}.endTime`}
          render={({ field, fieldState }) => (
            <FormItem>
              <span className="text-xs text-subtle sm:hidden">Cierre</span>
              <TimeField
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={timesDisabled}
                aria-label={`${label}: hora de cierre`}
                aria-invalid={!!fieldState.error}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
