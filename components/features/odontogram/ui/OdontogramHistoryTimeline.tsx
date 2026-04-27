"use client";

import { useMemo, useCallback } from "react";
import { Tooltip } from "antd";
import { RotateCcw } from "lucide-react";
import type { Appointment } from "@/lib/entity/appointment/appointments";

interface TimelinePoint {
  label: string;
  appointmentId: string;
  date: string; // ISO
  isCurrent: boolean;
}

interface OdontogramHistoryTimelineProps {
  appointments: Appointment[];
  /** Currently selected historic appointment ID (undefined = viewing current state) */
  historicAppointmentId?: string;
  /** Active consultation appointment ID — shown as "Hoy" marker */
  activeAppointmentId?: string;
  onSelectVisit: (appointmentId: string) => void;
  onReturnToCurrent: () => void;
}

/**
 * US-03 — Timeline histórico en la parte inferior del Tab Odontograma.
 * Muestra los snapshots disponibles (citas completadas/en curso) como
 * puntos navegables en una línea de tiempo.
 */
export function OdontogramHistoryTimeline({
  appointments,
  historicAppointmentId,
  activeAppointmentId,
  onSelectVisit,
  onReturnToCurrent,
}: OdontogramHistoryTimelineProps) {
  // Build sorted timeline points from completed + in_progress appointments
  const points: TimelinePoint[] = useMemo(() => {
    const eligible = appointments.filter(
      (a) =>
        a.status === "completed" ||
        a.status === "in_progress" ||
        a.id === activeAppointmentId,
    );
    const sorted = [...eligible].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return sorted.map((a) => ({
      label:
        a.id === activeAppointmentId
          ? "Hoy (Consulta Activa)"
          : new Date(a.date).toLocaleDateString("es-VE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
      appointmentId: a.id,
      date: a.date,
      isCurrent: a.id === activeAppointmentId,
    }));
  }, [appointments, activeAppointmentId]);

  const isViewingHistoric = !!historicAppointmentId;

  const handlePointClick = useCallback(
    (point: TimelinePoint, idx: number) => {
      // Clicking the last point (or the active consultation point) returns to current
      if (point.isCurrent || idx === points.length - 1) {
        onReturnToCurrent();
      } else {
        onSelectVisit(point.appointmentId);
      }
    },
    [onSelectVisit, onReturnToCurrent, points.length],
  );

  // Calculate % position for each point
  const total = Math.max(points.length - 1, 1);

  // The "current" position: activeAppointmentId if in consultation, else last completed visit
  const currentDefaultIdx = useMemo(() => {
    if (activeAppointmentId) {
      return points.findIndex((p) => p.isCurrent);
    }
    if (!historicAppointmentId) {
      return points.length - 1;
    }
    return -1;
  }, [activeAppointmentId, historicAppointmentId, points]);

  // Fill pct: up to selected historic, or 100% for current/default view
  const fillPct = useMemo(() => {
    if (historicAppointmentId) {
      const idx = points.findIndex(
        (p) => p.appointmentId === historicAppointmentId,
      );
      return idx >= 0 && total > 0 ? (idx / total) * 100 : 0;
    }
    return 100;
  }, [historicAppointmentId, points, total]);

  if (points.length < 2) return null; // nothing useful to show with 0–1 points

  return (
    <div className="bg-white border-b border-gray-100 px-6 pt-3 pb-4 shrink-0">
      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        {/* Labels: first + middle + last */}
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-slate-400">{points[0]?.label}</span>
          {points.length > 2 && (
            <span className="text-slate-400">
              {points[Math.floor(points.length / 2)]?.label}
            </span>
          )}
          <span className={activeAppointmentId ? "text-blue-600" : "text-blue-500 font-semibold"}>
            {points[points.length - 1]?.label}
          </span>
        </div>

        {/* Track */}
        <div className="relative h-1.5 w-full bg-slate-100 rounded-full">
          {/* Filled region */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-200 rounded-full transition-all"
            style={{ width: `${fillPct}%` }}
          />

          {/* Points */}
          {points.map((point, idx) => {
            const pct = total > 0 ? (idx / total) * 100 : 0;
            const isSelected = point.appointmentId === historicAppointmentId;
            const isActive = point.isCurrent;
            const isDefault = idx === currentDefaultIdx && !isActive;

            return (
              <Tooltip key={point.appointmentId} title={point.label}>
                <button
                  onClick={() => handlePointClick(point, idx)}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                  style={{ left: `${pct}%` }}
                >
                  <span
                    className={[
                      "block rounded-full border-2 border-white shadow-sm transition-all",
                      isActive
                        ? "w-5 h-5 bg-blue-600 shadow-md"
                        : isSelected || isDefault
                        ? "w-4 h-4 bg-blue-500"
                        : "w-3.5 h-3.5 bg-slate-300 hover:bg-slate-400",
                    ].join(" ")}
                  />
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Subtle "Volver al actual" link — only in historic mode */}
        {isViewingHistoric && (
          <button
            onClick={onReturnToCurrent}
            className="self-end flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Volver al actual
          </button>
        )}
      </div>
    </div>
  );
}
