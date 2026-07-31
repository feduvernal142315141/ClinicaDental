"use client";

import type { ReactNode } from "react";
import { Activity, CheckCircle, Crown, Scissors, Wrench, X } from "lucide-react";
import {
  GLOBAL_STATUS_META,
  GLOBAL_STATUS_ORDER,
  type ToothStatusTone,
} from "@/lib/odontogram/domain/odontogram/constants/tooth-status.constants";
import type { ToothGlobalStatus } from "@/lib/odontogram/domain/odontogram/types/tooth.types";
import { cn } from "@/lib/utils/utils";

/**
 * El chip se colorea por EJE, no por estado: rojo = por hacer, azul = hecho.
 * Así el propio selector enseña la convención del odontograma, y dos estados
 * del mismo eje (extracción indicada y corona por hacer) comparten color y se
 * distinguen por icono y etiqueta.
 */
const TONE_CHIP: Record<ToothStatusTone, { idle: string; active: string }> = {
  healthy: {
    idle: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    active: "border-emerald-500 bg-emerald-500 text-white",
  },
  pending: {
    idle: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    active: "border-rose-500 bg-rose-500 text-white",
  },
  done: {
    idle: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    active: "border-blue-500 bg-blue-500 text-white",
  },
  neutral: {
    idle: "border-slate-400/50 bg-slate-500/10 text-slate-600 dark:text-slate-300",
    active: "border-slate-500 bg-slate-600 text-white dark:bg-slate-500",
  },
  implant: {
    idle: "border-fuchsia-400/45 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
    active: "border-fuchsia-500 bg-fuchsia-500 text-white",
  },
};

const STATUS_ICONS: Record<ToothGlobalStatus, ReactNode> = {
  healthy: <CheckCircle className="h-3 w-3" aria-hidden />,
  extraction_indicated: <Scissors className="h-3 w-3" aria-hidden />,
  absent: <X className="h-3 w-3" aria-hidden />,
  endodontic: <Activity className="h-3 w-3" aria-hidden />,
  crown_pending: <Crown className="h-3 w-3" aria-hidden />,
  crown_done: <Crown className="h-3 w-3" aria-hidden />,
  implant: <Wrench className="h-3 w-3" aria-hidden />,
};

interface ToothStatusChipsProps {
  /**
   * `null` = la pieza NO tiene un estado global declarado: ningún chip se pinta
   * activo y el `radiogroup` queda sin selección. `ToothGlobalStatus` no tiene
   * un séptimo valor "sin estado", así que esta es la única forma honesta de
   * representar un diente con marcas al que nadie ha declarado sano.
   */
  value: ToothGlobalStatus | null;
  onChange: (status: ToothGlobalStatus) => void;
  readOnly?: boolean;
}

/** Selector del estado global de la pieza. */
export function ToothStatusChips({
  value,
  onChange,
  readOnly = false,
}: ToothStatusChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Estado de la pieza"
      className="flex flex-wrap gap-1.5"
    >
      {GLOBAL_STATUS_ORDER.map((status) => {
        const meta = GLOBAL_STATUS_META[status];
        const chip = TONE_CHIP[meta.tone];
        const isSelected = value === status;

        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={readOnly}
            title={meta.description}
            onClick={() => !readOnly && onChange(status)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
              "focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:outline-none",
              isSelected ? chip.active : chip.idle,
              readOnly
                ? "cursor-default opacity-70"
                : "cursor-pointer hover:scale-105 motion-reduce:hover:scale-100",
            )}
          >
            {STATUS_ICONS[status]}
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
