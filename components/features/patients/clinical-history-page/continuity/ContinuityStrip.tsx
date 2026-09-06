"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, ChevronDown, ListChecks, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/utils";
import { parseLocalValue } from "@/lib/datetime";
import { formatVisitDate } from "@/lib/utils/visit-eligibility";
import { SECTION_LABEL_CLASS } from "../section-label";

/**
 * Acción de consulta que el HOST resuelve y pasa ya decidida.
 *
 * - `hidden`          → ya hay una consulta activa; el "Finalizar" manda desde
 *                       la cinta de consulta activa, aquí no se pinta nada.
 * - `disabled`        → la lista de citas sigue en vuelo. No sabemos todavía si
 *                       existe una consulta abierta, así que el botón se pinta
 *                       deshabilitado con "Comprobando consultas…".
 * - `continue`        → hay una cita `in_progress` de este paciente.
 * - `start-scheduled` → hay una cita agendada para hoy sin iniciar.
 * - `start`           → no hay cita; consulta express.
 */
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

/** Acto clínico planificado y todavía no ejecutado (viene del plan vigente). */
export interface PendingAct {
  id: string;
  /** Pieza FDI ("1.6"). Ausente en actos que no son de una pieza concreta. */
  toothFdi?: string;
  label: string;
  /** `true` si ya tiene cita reservada. `undefined` = no se pudo determinar. */
  scheduled?: boolean;
}

export interface ContinuityStripProps {
  pendingActs?: PendingAct[];
  /**
   * No se pudo DETERMINAR qué queda pendiente: 403 del odontograma, fallo de
   * lectura, o rol sin el módulo. NO es lo mismo que "no hay nada pendiente", y
   * mezclarlos convierte un problema técnico en una afirmación clínica falsa.
   */
  pendingUnavailable?: boolean;
  /** Motivo, para poder decir si es de permisos o de carga. */
  pendingUnavailableReason?: "forbidden" | "error";
  pendingLoading?: boolean;
  nextAppointment?: { date: string; time?: string; doctorName?: string } | null;
  cta: ConsultationCta;
  onContinue?: (appointmentId: string) => void;
  onStartScheduled?: (appointmentId: string) => void | Promise<void>;
  onStartNow?: () => void;
  onViewPending?: (act: PendingAct) => void;
}

/** Chips visibles antes de plegar el resto tras un "+N más". */
const COLLAPSED_CHIPS = 6;

/** Botón primario de la franja. Objetivo táctil ≥44px en pointer:coarse. */
const PRIMARY_BUTTON_CLASS = cn(
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2",
  "text-sm font-semibold text-white shadow-sm outline-none",
  "transition-colors duration-200 ease-emphasized hover:bg-brand-strong",
  "focus-visible:ring-2 focus-visible:ring-brand/40",
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand",
  "sm:w-auto [@media(pointer:coarse)]:min-h-11",
);

/** "Juan Pérez" → "Dr. Juan Pérez"; "Dra. Ana" se deja tal cual. */
function withDoctorPrefix(name: string): string {
  return /^\s*dra?\.?\s/i.test(name) ? name.trim() : `Dr. ${name.trim()}`;
}

/**
 * Franja de continuidad: qué quedó pendiente, cuándo es la próxima sesión y el
 * CTA de consulta. Va bajo la cabecera del paciente, encima de la cronología.
 *
 * **No es un asiento de la historia clínica.** Está deliberadamente fuera de la
 * línea temporal porque se calcula del odontograma vivo y del plan vigente, no
 * de un acto fechado. Por eso se rotula así de explícito: quien lea la vista no
 * debe confundir este estado presente con una anotación firmada de una visita.
 *
 * No hace fetch: todo entra resuelto por props.
 *
 * ⚠️ **El gate de permiso lo aplica el HOST**, no este componente. El host
 * comprueba `isAdmin || can("appointments", PermissionAction.EDIT)` ANTES de
 * construir el `cta`, y pasa `{ kind: "hidden" }` cuando el usuario no puede
 * abrir consultas. Si reutilizas la franja en otra pantalla, replica ese gate:
 * aquí no hay ninguna comprobación de permisos.
 */
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

  // El CTA nombra una cita concreta: perderlo sería una regresión funcional,
  // no una tarjeta vacía. Los CTA genéricos ("start"/"disabled") sí se pueden
  // omitir porque el host los ofrece también desde la cabecera.
  const ctaNamesAVisit = cta.kind === "continue" || cta.kind === "start-scheduled";

  // Sin pendientes, sin próxima cita y sin nada que continuar → no se pinta
  // tarjeta vacía. Mientras carga tampoco se decide: evita el parpadeo.
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
  // Solo se desglosa si TODOS los actos traen el dato: un desglose que no suma
  // el total se lee como un error de cuentas.
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
        // Exhaustividad: si alguien añade un `kind` al union y no lo maneja
        // arriba, esta asignación deja de compilar.
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
        {/* ── Pendiente ─────────────────────────────────────────────── */}
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
            // Ni "hay" ni "no hay": NO SE SABE. Afirmar la ausencia aquí es el
            // mismo defecto que ya se corrigió en la columna de antecedentes —
            // un fallo de lectura presentado como hecho clínico— y esta franja
            // se rotula "Estado actual", así que se lee como afirmación sobre el
            // paciente justo mientras se decide el tratamiento.
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {pendingUnavailableReason === "forbidden"
                ? "No se puede determinar el plan pendiente con tu rol. Que no se muestre aquí no significa que el paciente no tenga tratamiento pendiente."
                : "No se pudo leer el plan pendiente. Que no se muestre aquí no significa que el paciente no tenga tratamiento pendiente."}
            </p>
          ) : (
            <p className="text-sm text-subtle">Sin actos pendientes del plan</p>
          )}
        </div>

        {/* ── Próxima sesión + CTA ──────────────────────────────────── */}
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
