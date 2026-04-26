"use client";

import { Lock } from "lucide-react";

interface OdontogramReadOnlyOverlayProps {
  onStartConsultation?: () => void;
}

/**
 * US-03 — Overlay visual sobre el odontograma en Modo Lectura.
 * Se coloca sobre PatientOdontogramPanel cuando no hay activeAppointmentId.
 */
export function OdontogramReadOnlyOverlay({
  onStartConsultation,
}: OdontogramReadOnlyOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
      {/* Backdrop: grayscale + opacity applied via CSS parent class, this is just the floating card */}
      <div className="pointer-events-auto bg-white/90 backdrop-blur-sm px-6 py-4 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center gap-3 max-w-xs text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <Lock className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            Vista de solo lectura
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Inicia una consulta para editar el odontograma
          </p>
        </div>
        {onStartConsultation && (
          <button
            onClick={onStartConsultation}
            className="mt-1 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
          >
            Iniciar consulta
          </button>
        )}
      </div>
    </div>
  );
}
