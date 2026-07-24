"use client";

import { useController, useFormContext, useWatch } from "react-hook-form";

import {
  ClosedState,
  DayOverviewStrip,
  DayToggle,
  ScheduleDayCard,
  TimeRangeField,
  type ScheduleDayStatus,
} from "@/components/ui/atomic/schedule";
import { CLINIC_SCHEDULE_DAYS } from "@/lib/entity/settings";
import type { ClinicScheduleDayKey } from "@/lib/entity/settings";
import type { GeneralSettingsFormValues } from "@/lib/hooks/settings";

/** Horario por defecto al abrir un día que no tenía horas definidas. */
const DEFAULT_OPEN_START = "08:00";
const DEFAULT_OPEN_END = "17:00";

/** Inicial de cada día para el resumen (convención ES: miércoles = X). */
const DAY_SHORT: Record<ClinicScheduleDayKey, string> = {
  monday: "L",
  tuesday: "M",
  wednesday: "X",
  thursday: "J",
  friday: "V",
  saturday: "S",
  sunday: "D",
};

interface ScheduleEditorProps {
  disabled?: boolean;
}

/**
 * ScheduleEditor — editor del horario semanal de la clínica (variante
 * ClinicPro): un resumen read-only de días arriba + una rejilla de tiles
 * (uno por día) con los átomos compartidos de `@/components/ui/atomic/schedule`
 * (misma gramática que el editor de horario del doctor).
 *
 * Se renderiza dentro del `<Form {...form}>` del padre (usa
 * `useFormContext<GeneralSettingsFormValues>`). La validación cruzada vive en
 * `generalSettingsFormSchema` y se muestra vía el `errorMessage` de cada slot.
 */
export function ScheduleEditor({ disabled = false }: ScheduleEditorProps) {
  const { control } = useFormContext<GeneralSettingsFormValues>();
  const schedule = useWatch({ control, name: "schedule" });

  const overviewDays = CLINIC_SCHEDULE_DAYS.map(({ key, label }) => ({
    short: DAY_SHORT[key],
    label,
    active: !!schedule?.[key]?.enabled,
  }));

  return (
    <div className="space-y-3">
      <DayOverviewStrip days={overviewDays} />
      {/* Rejilla de 2 columnas en desktop; una sola en móvil/tablet. */}
      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
        {CLINIC_SCHEDULE_DAYS.map(({ key, label }) => (
          <ScheduleDayRow key={key} dayKey={key} label={label} disabled={disabled} />
        ))}
      </div>
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
  const { control } = useFormContext<GeneralSettingsFormValues>();

  const enabledField = useController({
    control,
    name: `schedule.${dayKey}.enabled`,
  });
  const startField = useController({
    control,
    name: `schedule.${dayKey}.startTime`,
  });
  const endField = useController({
    control,
    name: `schedule.${dayKey}.endTime`,
  });

  const enabled = !!enabledField.field.value;
  // Fin de semana cerrado → estado informativo ámbar (política institucional),
  // distinto del gris neutro de un día laboral cerrado por el usuario.
  const isWeekend = dayKey === "saturday" || dayKey === "sunday";
  const cardStatus: ScheduleDayStatus = enabled
    ? "open"
    : isWeekend
      ? "clinic-closed"
      : "closed";
  const pillStatus = enabled ? "active" : isWeekend ? "clinic-closed" : "closed";

  return (
    <ScheduleDayCard
      status={cardStatus}
      toggleSlot={
        <DayToggle
          label={label}
          status={pillStatus}
          checked={enabled}
          onCheckedChange={(checked) => {
            enabledField.field.onChange(checked);
            // Al ABRIR un día sin horas, prellenar un horario por defecto.
            if (checked) {
              if (!startField.field.value) startField.field.onChange(DEFAULT_OPEN_START);
              if (!endField.field.value) endField.field.onChange(DEFAULT_OPEN_END);
            }
          }}
          disabled={disabled}
        />
      }
    >
      {enabled ? (
        <TimeRangeField
          heading="Horario de Consulta"
          startLabel="Desde"
          endLabel="Hasta"
          start={{
            value: startField.field.value ?? "",
            onChange: startField.field.onChange,
            onBlur: startField.field.onBlur,
            ariaLabel: `${label}: hora de apertura`,
            ariaInvalid: !!startField.fieldState.error,
            errorMessage: startField.fieldState.error?.message,
          }}
          end={{
            value: endField.field.value ?? "",
            onChange: endField.field.onChange,
            onBlur: endField.field.onBlur,
            ariaLabel: `${label}: hora de cierre`,
            ariaInvalid: !!endField.fieldState.error,
            errorMessage: endField.fieldState.error?.message,
          }}
          disabled={disabled}
        />
      ) : isWeekend ? (
        <ClosedState
          variant="clinic-closed"
          message={`La clínica permanece cerrada los ${label.toLowerCase()} por política institucional.`}
        />
      ) : (
        <ClosedState variant="off" />
      )}
    </ScheduleDayCard>
  );
}
