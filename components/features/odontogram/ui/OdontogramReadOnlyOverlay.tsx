"use client";

import { Lock } from "lucide-react";



/**
 * US-03 — Overlay visual sobre el odontograma en Modo Lectura.
 * Se coloca sobre PatientOdontogramPanel cuando no hay activeAppointmentId.
 */
export function OdontogramReadOnlyOverlay() {
  return (
    <div className="absolute top-3 right-4 z-10 pointer-events-none">
      <div className="bg-slate-100/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1.5 shadow-sm">
        <Lock className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-medium text-slate-600">
          Solo lectura
        </span>
      </div>
    </div>
  );
}
