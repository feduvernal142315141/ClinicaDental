"use client";

import { useEffect, useState } from "react";

import { CheckCircle, Timer, Loader2, AlertTriangle } from "lucide-react";
import { useActiveConsultation } from "@/lib/store/useActiveConsultation";
import { useAutosaveStatus } from "@/lib/store/useAutosaveStatus";

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

function formatSavedAgo(lastSavedAt: number | null): string {
  if (!lastSavedAt) return "Guardado";
  const secs = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000));
  if (secs < 5) return "Guardado";
  if (secs < 60) return `Guardado hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  return `Guardado hace ${mins} min`;
}

export function ActiveConsultationBanner({
  onFinalizeClick,
}: ActiveConsultationBannerProps) {
  const { patientName, criticalAlerts, startTime } = useActiveConsultation();
  const { status: saveStatus, lastSavedAt } = useAutosaveStatus();

  // Avoid SSR hydration mismatch with localStorage-persisted store
  const [mounted, setMounted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Al desmontar el banner (cerrar/cambiar de consulta) se reinicia el estado.
    return () => useAutosaveStatus.getState().reset();
  }, []);

  useEffect(() => {
    if (!startTime || !mounted) return;
    const tick = () => setElapsed(Date.now() - startTime);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime, mounted]);

  if (!mounted || !patientName) return null;

  return (
    <div className="bg-emerald-500/15 border-b border-emerald-400/25 px-6 py-2 flex items-center justify-between shrink-0 gap-4">
      {/* Left: status + timer + alerts */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Pulse indicator + name */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">
            Consulta en curso:{" "}
            <span className="font-extrabold">{patientName}</span>
          </span>
        </div>

        {/* Elapsed timer */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-elevated rounded-full border border-emerald-400/25">
          <Timer className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
          <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold text-sm tracking-widest tabular-nums">
            {formatElapsed(elapsed)}
          </span>
        </div>

        {/* Critical alert chips (allergies, etc.) */}
        {criticalAlerts.map((alert) => (
          <span
            key={alert}
            className="bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
          >
            ⚠ {alert}
          </span>
        ))}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Indicador de autosave real (guardando / guardado / error) */}
        {saveStatus === "saving" ? (
          <span className="flex items-center gap-1.5 rounded-lg border border-hairline bg-elevated px-3 py-1.5 text-xs font-semibold text-subtle">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Guardando…
          </span>
        ) : saveStatus === "error" ? (
          <span className="flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Error al guardar
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-lg border border-hairline bg-elevated px-3 py-1.5 text-xs font-semibold text-subtle">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
            {saveStatus === "saved"
              ? formatSavedAgo(lastSavedAt)
              : "Guardado automático"}
          </span>
        )}
        <button
          onClick={onFinalizeClick}
          className="bg-destructive text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm hover:bg-destructive/90 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Finalizar Consulta
        </button>
      </div>
    </div>
  );
}
