"use client";

import { useEffect, useState, useCallback } from "react";
import { App } from "antd";
import { CheckCircle, Timer } from "lucide-react";
import { useActiveConsultation } from "@/lib/store/useActiveConsultation";

interface ActiveConsultationBannerProps {
  /** Called when the doctor clicks "Finalizar Consulta" — should navigate to Odontograma tab */
  onFinalizeClick?: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function ActiveConsultationBanner({
  onFinalizeClick,
}: ActiveConsultationBannerProps) {
  const { patientName, criticalAlerts, startTime } = useActiveConsultation();
  const { message } = App.useApp();

  // Avoid SSR hydration mismatch with localStorage-persisted store
  const [mounted, setMounted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!startTime || !mounted) return;
    const tick = () => setElapsed(Date.now() - startTime);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime, mounted]);

  const handleSaveDraft = useCallback(() => {
    void message.info("Los datos se guardan automáticamente");
  }, [message]);

  if (!mounted || !patientName) return null;

  return (
    <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2 flex items-center justify-between shrink-0 gap-4">
      {/* Left: status + timer + alerts */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Pulse indicator + name */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-emerald-900 font-bold text-sm">
            Consulta en curso:{" "}
            <span className="font-extrabold">{patientName}</span>
          </span>
        </div>

        {/* Elapsed timer */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/70 rounded-full border border-emerald-200">
          <Timer className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-mono text-emerald-800 font-bold text-sm tracking-widest">
            {formatElapsed(elapsed)}
          </span>
        </div>

        {/* Critical alert chips (allergies, etc.) */}
        {criticalAlerts.map((alert) => (
          <span
            key={alert}
            className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
          >
            ⚠ {alert}
          </span>
        ))}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleSaveDraft}
          className="bg-white border border-gray-200 text-slate-600 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          Guardado automático ✓
        </button>
        <button
          onClick={onFinalizeClick}
          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm hover:bg-red-700 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Finalizar Consulta
        </button>
      </div>
    </div>
  );
}
