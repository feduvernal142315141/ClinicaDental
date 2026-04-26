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
    (point: TimelinePoint) => {
      if (point.isCurrent) {
        onReturnToCurrent();
      } else {
        onSelectVisit(point.appointmentId);
      }
    },
    [onSelectVisit, onReturnToCurrent],
  );

  if (points.length < 2) return null; // nothing useful to show with 0–1 points

  // Calculate % position for each point
  const total = points.length - 1;

  return (
    <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        {/* Labels: first + last + "Hoy" */}
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>{points[0]?.label}</span>
          {points.length > 2 && (
            <span>
              {points[Math.floor(points.length / 2)]?.label}
            </span>
          )}
          <span
            className={
              activeAppointmentId ? "text-blue-600" : "text-slate-400"
            }
          >
            {points[points.length - 1]?.label}
          </span>
        </div>

        {/* Track */}
        <div className="relative h-1.5 w-full bg-slate-100 rounded-full">
          {/* Filled region up to selected point */}
          {historicAppointmentId && (() => {
            const idx = points.findIndex(
              (p) => p.appointmentId === historicAppointmentId,
            );
            if (idx < 0) return null;
            const pct = total > 0 ? (idx / total) * 100 : 0;
            return (
              <div
                className="absolute top-0 left-0 h-full bg-blue-200 rounded-full"
                style={{ width: `${pct}%` }}
              />
            );
          })()}

          {/* Points */}
          {points.map((point, idx) => {
            const pct = total > 0 ? (idx / total) * 100 : 0;
            const isSelected = point.appointmentId === historicAppointmentId;
            const isActive = point.isCurrent;

            return (
              <Tooltip key={point.appointmentId} title={point.label}>
                <button
                  onClick={() => handlePointClick(point)}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                  style={{ left: `${pct}%` }}
                >
                  <span
                    className={[
                      "block rounded-full border-2 border-white shadow-sm transition-all",
                      isActive
                        ? "w-5 h-5 bg-blue-600 shadow-md"
                        : isSelected
                        ? "w-4 h-4 bg-blue-500"
                        : "w-3.5 h-3.5 bg-slate-300 hover:bg-slate-400",
                    ].join(" ")}
                  />
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* "Volver al estado actual" floating action — visible only in historic mode */}
      {isViewingHistoric && (
        <div className="flex justify-end mt-3">
          <button
            onClick={onReturnToCurrent}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow hover:bg-blue-700 active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Volver a Estado Actual
          </button>
        </div>
      )}
    </div>
  );
}
