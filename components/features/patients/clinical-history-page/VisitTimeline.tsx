"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  Activity,
} from "lucide-react";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { CancelModal } from "@/components/features/appointments/scheduler/CancelModal";
import { RescheduleModal } from "@/components/features/appointments/scheduler/RescheduleModal";
import type {
  Appointment,
  AppointmentStatus,
} from "@/lib/entity/appointment/appointments";
import { SECTION_LABEL_CLASS } from "./section-label";

export interface VisitTimelineProps {
  appointments: Appointment[];
  loading: boolean;
  activeAppointmentId?: string;
  onViewVisitHistory?: (appointment: Appointment) => void;
  onStartConsultation?: (appointmentId: string) => void;
  onNewConsultation?: () => void;
}

interface StatusConfig {
  dotClass: string;
  /** Tono del `StatusBadge` del pill de estado. */
  tone: StatusBadgeTone;
  lineClass: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * OJO — divergencia de color **conservada a propósito**: en esta cronología
 * "En curso" es VERDE (`success`) y "Completada" es AZUL (`progress`), al revés
 * que en `TreatmentStatusOverview` / `TreatmentPlansPendingSection`. Unificarlo
 * cambiaría lo que se comunica (verde = visita activa aquí), así que es una
 * decisión de producto, no de este pase visual.
 */
function getStatusConfig(status: AppointmentStatus): StatusConfig {
  switch (status) {
    case "in_progress":
      return {
        dotClass:
          "bg-emerald-500 ring-2 ring-emerald-300/60 dark:ring-emerald-700/60",
        tone: "success",
        lineClass: "bg-emerald-300/50",
        label: "En curso",
        icon: <Activity className="h-3 w-3" />,
      };
    case "completed":
      return {
        dotClass: "bg-sky-500",
        tone: "progress",
        lineClass: "bg-hairline",
        label: "Completada",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "scheduled":
      return {
        dotClass: "bg-amber-400",
        tone: "warning",
        lineClass: "bg-hairline",
        label: "Agendada",
        icon: <Clock className="h-3 w-3" />,
      };
    case "cancelled":
    case "no-show":
    case "no_show":
      return {
        dotClass: "bg-rose-400 opacity-70",
        tone: "danger",
        lineClass: "bg-hairline",
        label: status === "cancelled" ? "Cancelada" : "No asistió",
        icon: <XCircle className="h-3 w-3" />,
      };
    default:
      return {
        dotClass: "bg-muted-foreground/40",
        tone: "neutral",
        lineClass: "bg-hairline",
        label: "Desconocido",
        icon: <AlertCircle className="h-3 w-3" />,
      };
  }
}

const MONTH_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

function formatVisitDate(dateStr: string): string {
  try {
    const [year, monthStr, dayStr] = dateStr.split("-");
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || isNaN(month) || isNaN(day)) return dateStr;
    return `${String(day).padStart(2, "0")} ${MONTH_SHORT[month - 1] ?? "?"} ${year}`;
  } catch {
    return dateStr;
  }
}

export function VisitTimeline({
  appointments,
  loading,
  activeAppointmentId,
  onViewVisitHistory,
  onStartConsultation,
  onNewConsultation,
}: VisitTimelineProps) {
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(
    null,
  );

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /**
   * Sort order:
   * 1. in_progress (active consultation) — always first
   * 2. scheduled — upcoming, newest first
   * 3. completed/cancelled/no_show — past, newest first
   */
  const sorted = useMemo<Appointment[]>(() => {
    const statusOrder = (s: AppointmentStatus): number => {
      if (s === "in_progress") return 0;
      if (s === "scheduled") return 1;
      return 2;
    };
    return [...appointments].sort((a, b) => {
      const orderDiff = statusOrder(a.status) - statusOrder(b.status);
      if (orderDiff !== 0) return orderDiff;
      return b.date.localeCompare(a.date);
    });
  }, [appointments]);

  const inProgress = appointments.find((a) => a.status === "in_progress");
  const todayScheduled = appointments.find(
    (a) => a.status === "scheduled" && a.date === today,
  );
  const startableAppt = inProgress ?? todayScheduled ?? null;
  const canStartExisting = !!startableAppt && !!onStartConsultation;
  const canNewConsultation = !!onNewConsultation;

  return (
    <div className="flex flex-col gap-3">
      {/* ── CTA: continuar o nueva consulta ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => {
          if (canStartExisting) {
            onStartConsultation!(startableAppt!.id);
          } else {
            onNewConsultation?.();
          }
        }}
        disabled={!canStartExisting && !canNewConsultation}
        className="w-full group flex items-center justify-center gap-3 p-4 border-2 border-dashed border-hairline rounded-xl text-subtle hover:border-brand hover:text-brand hover:bg-brand/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-hairline disabled:hover:text-subtle disabled:hover:bg-transparent"
      >
        <div className="bg-hover group-hover:bg-brand/15 p-2 rounded-full transition-colors">
          <Plus className="h-4 w-4" />
        </div>
        <span className="font-bold text-sm">
          {canStartExisting ? "Continuar Consulta" : "Iniciar Nueva Consulta"}
        </span>
      </button>

      {/* ── Cronología ──────────────────────────────────────────────────── */}
      <section className="bento overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline shrink-0">
          <h3 className={SECTION_LABEL_CLASS}>Cronología de visitas</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" message="Cargando visitas..." />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-subtle" />
            </div>
            <p className="text-sm text-subtle">Sin visitas registradas</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <ul className="relative space-y-0" role="list">
              {sorted.map((appt, idx) => {
                const cfg = getStatusConfig(appt.status);
                const isActive = appt.id === activeAppointmentId;
                const canView =
                  (appt.status === "completed" ||
                    appt.status === "in_progress") &&
                  !!onViewVisitHistory;
                const canCancel = appt.status === "scheduled";
                const isLast = idx === sorted.length - 1;

                return (
                  <li key={appt.id} className="relative flex gap-3 min-w-0">
                    {/* Dot + connector */}
                    <div className="relative flex flex-col items-center shrink-0 w-5">
                      <div
                        className={`relative z-10 w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white ${cfg.dotClass} ${isActive ? "ring-2 ring-brand ring-offset-2" : ""}`}
                        aria-hidden
                      />
                      {!isLast && (
                        <div
                          className={`w-px flex-1 min-h-[20px] ${cfg.lineClass} mt-1`}
                          aria-hidden
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-5"}`}
                    >
                      {/* Header row */}
                      <div className="flex items-start gap-2 justify-between flex-wrap">
                        <p className="text-xs font-semibold text-foreground leading-snug">
                          {formatVisitDate(appt.date)}
                          {appt.time ? (
                            <span className="font-normal text-subtle">
                              {" · "}
                              {appt.time}
                            </span>
                          ) : null}
                        </p>
                        <StatusBadge
                          tone={cfg.tone}
                          className="shrink-0 gap-1 px-1.5 text-[10px]"
                        >
                          {cfg.icon}
                          {cfg.label}
                        </StatusBadge>
                      </div>

                      {/* Descriptor */}
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {appt.serviceName ?? appt.reason ?? "Consulta general"}
                        {appt.doctorName ? ` · Dr. ${appt.doctorName}` : ""}
                      </p>

                      {/* Acciones */}
                      {(canView || canCancel) && (
                        <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => onViewVisitHistory!(appt)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                            >
                              Ver historial
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                          {canCancel && (
                            <>
                              <button
                                type="button"
                                onClick={() => setCancelAppt(appt)}
                                className="text-[11px] font-semibold text-destructive hover:underline"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => setRescheduleAppt(appt)}
                                className="text-[11px] font-semibold text-brand hover:underline"
                              >
                                Reagendar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Modals */}
      {cancelAppt && (
        <CancelModal
          appointment={cancelAppt}
          isOpen
          onClose={() => setCancelAppt(null)}
          onSuccess={() => setCancelAppt(null)}
        />
      )}
      {rescheduleAppt && (
        <RescheduleModal
          appointment={rescheduleAppt}
          isOpen
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => setRescheduleAppt(null)}
        />
      )}
    </div>
  );
}
