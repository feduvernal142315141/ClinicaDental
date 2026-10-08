import { CheckCircle2 } from "lucide-react";
import { LinkButton } from "@/components/features/billing/shared/LinkButton";
import type { LeadConversionResult } from "@/lib/entity/leads";
import { formatLeadCalendarDate } from "../shared/lead-format";

/** Confirmación tras reservar o convertir: enlaces a la ficha del paciente y a la cita. */
export function LeadConversionSummary({
  result,
  onNavigate,
}: {
  result: LeadConversionResult;
  onNavigate?: () => void;
}) {
  const { appointment, patientCreated, lead } = result;
  const existing = lead.outcome === "EXISTING_PATIENT";

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-ink">
            {appointment ? "Cita reservada" : existing ? "Prospecto enlazado al paciente" : "Prospecto convertido"}
          </p>
          {appointment && (
            <p className="text-ink">
              {formatLeadCalendarDate(appointment.date)} a las {appointment.time} · {appointment.duration} min
            </p>
          )}
          <p className="text-subtle">
            {existing
              ? "La persona ya era paciente: el prospecto quedó cerrado y enlazado a su ficha."
              : patientCreated
                ? "Se creó la ficha del paciente. Podrás completar sus datos más adelante."
                : "Se enlazó con la ficha del paciente."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/patients/${result.patientId}`} onClick={onNavigate}>
          Ver paciente
        </LinkButton>
        {appointment && (
          <LinkButton href={`/appointments/${appointment.id}`} variant="outline" onClick={onNavigate}>
            Ver cita
          </LinkButton>
        )}
      </div>
    </div>
  );
}
