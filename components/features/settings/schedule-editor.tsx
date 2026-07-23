"use client";

import { useController, useFormContext } from "react-hook-form";

import {
  ClosedState,
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

interface ScheduleEditorProps {
  disabled?: boolean;
}

/**
 * ScheduleEditor — editor del horario semanal de la clínica (7 días), a
 * partir de los átomos compartidos de `@/components/ui/atomic/schedule`
 * (misma gramática visual que el editor de horario del doctor).
 *
 * Debe renderizarse dentro del `<Form {...form}>` del padre (usa
 * `useFormContext<GeneralSettingsFormValues>`). La validación cruzada
 * (día habilitado requiere apertura/cierre coherentes) vive en
 * `generalSettingsFormSchema` y se muestra vía el `errorMessage` propio del
 * slot de hora (`ScheduleTimeField`, dentro de `TimeRangeField`).
 *
 * El header de sección ("Horarios de atención") ya lo pinta el
 * `SectionHeader` de `general-settings.tsx`; este componente no repite un
 * segundo encabezado.
 */
export function ScheduleEditor({ disabled = false }: ScheduleEditorProps) {
  return (
    // Grid de 2 columnas en desktop (diseño de referencia 2026): dos días por
    // fila; una sola columna en móvil/tablet donde no cabe la fila completa.
    <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
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
  // Fin de semana cerrado → estado informativo ámbar ("Cierre por política de
  // fin de semana"), distinto del gris neutro de un día laboral cerrado.
  const isWeekend = dayKey === "saturday" || dayKey === "sunday";
  const status: ScheduleDayStatus = enabled
    ? "open"
    : isWeekend
      ? "clinic-closed"
      : "closed";

  return (
    <ScheduleDayCard
      status={status}
      toggleSlot={
        <DayToggle
          label={label}
          checked={enabled}
          onCheckedChange={(checked) => {
            enabledField.field.onChange(checked);
            // Al ABRIR un día sin horas, prellenar un horario por defecto
            // (08:00–17:00) en vez de dejar "--:--", para que el usuario no
            // tenga que definirlo desde cero.
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
          startLabel="Desde:"
          endLabel="Hasta:"
          separator=":"
          align="end"
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
          message="Cierre por política de fin de semana"
        />
      ) : (
        <ClosedState variant="off" />
      )}
    </ScheduleDayCard>
  );
}
