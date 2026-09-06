"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, ChevronDown, ListChecks, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/utils";
import { parseLocalValue } from "@/lib/datetime";
import { formatVisitDate } from "@/lib/utils/visit-eligibility";
import { SECTION_LABEL_CLASS } from "../section-label";

export type ConsultationCta =
  | { kind: "hidden" }
  | { kind: "disabled" }
  | { kind: "continue"; appointmentId: string }
  | {
      kind: "start-scheduled";
      appointmentId: string;
      time: string;
      doctorName?: string;
    }
  | { kind: "start" };
export interface PendingAct {
  id: string;
  toothFdi?: string;
  label: string;
  scheduled?: boolean;
}
export interface ContinuityStripProps {
  pendingActs?: PendingAct[];
  pendingUnavailable?: boolean;
  pendingUnavailableReason?: "forbidden" | "error";
  pendingLoading?: boolean;
  nextAppointment?: { date: string; time?: string; doctorName?: string } | null;
  cta: ConsultationCta;
  onContinue?: (appointmentId: string) => void;
  onStartScheduled?: (appointmentId: string) => void | Promise<void>;
  onStartNow?: () => void;
  onViewPending?: (act: PendingAct) => void;
}
const COLLAPSED_CHIPS = 6;
const PRIMARY_BUTTON_CLASS = cn(
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2",
  "text-sm font-semibold text-white shadow-sm outline-none",
  "transition-colors duration-200 ease-emphasized hover:bg-brand-strong",
  "focus-visible:ring-2 focus-visible:ring-brand/40",
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand",
  "sm:w-auto [@media(pointer:coarse)]:min-h-11",
);
function withDoctorPrefix(name: string): string {
  return /^\s*dra?\.?\s/i.test(name) ? name.trim() : `Dr. ${name.trim()}`;
}

export function ContinuityStrip({
  pendingActs,
  pendingUnavailable = false,
  pendingUnavailableReason,
  pendingLoading = false,
  nextAppointment,
  cta,
  onContinue,
  onStartScheduled,
  onStartNow,
  onViewPending,
}: ContinuityStripProps) {
  const [expanded, setExpanded] = useState(false);
  const [starting, setStarting] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const acts = pendingActs ?? [];
  const hasPending = acts.length > 0;
  const hasNext = Boolean(nextAppointment?.date);
  const ctaNamesAVisit = cta.kind === "continue" || cta.kind === "start-scheduled";
  if (
    !pendingLoading &&
    !pendingUnavailable &&
    !hasPending &&
    !hasNext &&
    !ctaNamesAVisit
  ) {
    return null;
  }
  const scheduledCount = acts.filter((a) => a.scheduled === true).length;
  const unscheduledCount = acts.filter((a) => a.scheduled === false).length;

  const canBreakDown = hasPending && scheduledCount + unscheduledCount === acts.length;
  const visibleActs = expanded ? acts : acts.slice(0, COLLAPSED_CHIPS);
  const hiddenCount = acts.length - visibleActs.length;
  const handleStartScheduled = async (appointmentId: string) => {
    if (!onStartScheduled || starting) return;
    setStarting(true);
    try {
      await onStartScheduled(appointmentId);
    } finally {
      if (mounted.current) setStarting(false);
    }
  };

  const nextDate = parseLocalValue(nextAppointment?.date);
  const nextLine = [
    nextDate ? formatVisitDate(nextDate) : null,
    nextAppointment?.time || null,
    nextAppointment?.doctorName
      ? withDoctorPrefix(nextAppointment.doctorName)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  function renderCta() {
    switch (cta.kind) {
      case "hidden":
        return null;
      case "disabled":
        return (
          <button
            type="button"
            disabled
            aria-busy="true"
            className={PRIMARY_BUTTON_CLASS}
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            Comprobando consultas…
          </button>
        );
      case "continue": {
        const appointmentId = cta.appointmentId;
        return (
          <button
            type="button"
            onClick={() => onContinue?.(appointmentId)}
            className={PRIMARY_BUTTON_CLASS}
          >
            Continuar consulta
          </button>
        );
      }

      case "start-scheduled": {
        const { appointmentId, time, doctorName } = cta;
        return (
          <button
            type="button"
            onClick={() => void handleStartScheduled(appointmentId)}
            disabled={starting}
            aria-busy={starting}
            className={PRIMARY_BUTTON_CLASS}
          >
            {starting && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            )}
            <span className="text-left">
              {`Iniciar consulta de las ${time}`}
              {doctorName ? ` · ${withDoctorPrefix(doctorName)}` : ""}
            </span>
          </button>
        );
      }
      case "start":
        return (
          <button
            type="button"
            onClick={() => onStartNow?.()}
            className={PRIMARY_BUTTON_CLASS}
          >
            + Nueva consulta
          </button>
        );
      default: {
        const _never: never = cta;
        void _never;
        return null;
      }
    }
  }
  return (
    <section className="bento p-4">
      <h3 className={SECTION_LABEL_CLASS}>
        Estado actual · no es un asiento de la historia
      </h3>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {pendingLoading ? (
            <div className="space-y-2">
              <span className="sr-only">Cargando actos pendientes…</span>
              <div
                className="h-4 w-48 animate-pulse rounded bg-hover"
                aria-hidden
              />
              <div className="flex flex-wrap gap-1.5" aria-hidden>
                <div className="h-6 w-28 animate-pulse rounded-full bg-hover" />
                <div className="h-6 w-36 animate-pulse rounded-full bg-hover" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-hover" />
              </div>
            </div>
          ) : hasPending ? (
            <>
              <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-ink">
                <ListChecks
                  className="h-4 w-4 shrink-0 translate-y-0.5 text-brand"
                  aria-hidden
                />
                <span className="font-semibold">
                  {acts.length === 1
                    ? "Queda 1 acto por ejecutar"
                    : `Quedan ${acts.length} actos por ejecutar`}
                </span>
                {canBreakDown && (
                  <span className="text-xs text-subtle">
                    {`— ${scheduledCount} agendado${
                      scheduledCount === 1 ? "" : "s"
                    } · ${unscheduledCount} sin agendar`}
                  </span>
                )}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {visibleActs.map((act) => {
                  const text = act.toothFdi
                    ? `${act.toothFdi} · ${act.label}`
                    : act.label;
                  const chipClass = cn(
                    "inline-flex max-w-full items-center rounded-full border border-hairline",
                    "bg-elevated px-2.5 py-1 text-xs text-ink",
                  );
                  return (
                    <li key={act.id} className="min-w-0">
                      {onViewPending ? (
                        <button
                          type="button"
                          onClick={() => onViewPending(act)}
                          title={text}
                          className={cn(
                            chipClass,
                            "outline-none transition-colors duration-200 ease-emphasized",
                            "hover:border-brand/40 hover:bg-hover",
                            "focus-visible:ring-2 focus-visible:ring-brand/40",
                          )}
                        >
                          <span className="truncate">{text}</span>
                        </button>
                      ) : (
                        <span className={chipClass} title={text}>
                          <span className="truncate">{text}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
                {hiddenCount > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setExpanded(true)}
                      aria-expanded={expanded}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                        "text-xs font-semibold text-brand outline-none",
                        "transition-colors duration-200 ease-emphasized hover:bg-hover",
                        "focus-visible:ring-2 focus-visible:ring-brand/40",
                      )}
                    >
                      {`+${hiddenCount} más`}
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                )}
              </ul>
            </>
          ) : pendingUnavailable ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {pendingUnavailableReason === "forbidden"
                ? "No se puede determinar el plan pendiente con tu rol. Que no se muestre aquí no significa que el paciente no tenga tratamiento pendiente."
                : "No se pudo leer el plan pendiente. Que no se muestre aquí no significa que el paciente no tenga tratamiento pendiente."}
            </p>
          ) : (
            <p className="text-sm text-subtle">Sin actos pendientes del plan</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-3 lg:items-end">
          {hasNext && (
            <div className="lg:text-right">
              <p className={SECTION_LABEL_CLASS}>Próxima sesión</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink lg:justify-end">
                <CalendarClock
                  className="h-4 w-4 shrink-0 text-brand"
                  aria-hidden
                />
                {nextLine}
              </p>
            </div>
          )}
          {renderCta()}
        </div>
      </div>
    </section>
  );
}
