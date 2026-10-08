"use client";

import { Label } from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import {
  PUBLIC_BOOKING_MAX_ADVANCE_OPTIONS,
  PUBLIC_BOOKING_MIN_ADVANCE_OPTIONS,
  PUBLIC_BOOKING_SLOT_INTERVAL_OPTIONS,
  bookingNumberOptions,
  formatBookingDays,
  formatBookingMinutes,
  type PublicBookingFormValues,
} from "@/lib/entity/leads";
import type { LeadPublicBookingForm } from "@/lib/hooks/leads";

type RuleField = "minAdvanceMinutes" | "maxAdvanceDays" | "slotIntervalMinutes";

const RULES: {
  field: RuleField;
  label: string;
  help: string;
  options: readonly number[];
  format: (value: number) => string;
}[] = [
  {
    field: "minAdvanceMinutes",
    label: "Anticipación mínima",
    help: "Lo más pronto que puede empezar una cita reservada en línea.",
    options: PUBLIC_BOOKING_MIN_ADVANCE_OPTIONS,
    format: formatBookingMinutes,
  },
  {
    field: "maxAdvanceDays",
    label: "Reservar hasta con",
    help: "Hasta cuántos días hacia adelante se muestra el calendario.",
    options: PUBLIC_BOOKING_MAX_ADVANCE_OPTIONS,
    format: (days) => `${formatBookingDays(days)} de anticipación`,
  },
  {
    field: "slotIntervalMinutes",
    label: "Intervalo entre horarios",
    help: "Cada cuánto se ofrece una hora de inicio.",
    options: PUBLIC_BOOKING_SLOT_INTERVAL_OPTIONS,
    format: formatBookingMinutes,
  },
];

/** Reglas de agenda: anticipación mínima, horizonte e intervalo entre horarios. */
export function PublicBookingRules({ form }: { form: LeadPublicBookingForm }) {
  const { values, change, readOnly, fieldErrors } = form;

  return (
    <section className="bento space-y-4 p-5" aria-labelledby="booking-rules-title">
      <h2 id="booking-rules-title" className="text-lg font-semibold text-ink">
        Reglas de agenda
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {RULES.map(({ field, label, help, options, format }) => {
          const id = `booking-rule-${field}`;
          const error = fieldErrors[field]?.message;
          return (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={id} className="text-sm font-medium text-ink">
                {label}
              </Label>
              <SearchSelect
                id={id}
                aria-label={label}
                value={String(values[field])}
                onChange={(value) => change({ ...values, [field]: Number(value) } as PublicBookingFormValues)}
                options={bookingNumberOptions(options, values[field], format)}
                searchable={false}
                disabled={readOnly}
              />
              {error ? (
                <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </p>
              ) : (
                <p className="text-xs text-subtle">{help}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
