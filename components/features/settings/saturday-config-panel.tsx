"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Calendar, CalendarClock, CalendarDays, Repeat, Settings2 } from "lucide-react";

import {
  DayToggle,
  ScheduleDayCard,
  TimeRangeField,
  type ScheduleDayStatus,
} from "@/components/ui/atomic/schedule";
import type { GeneralSettingsFormValues } from "@/lib/hooks/settings";
import type { SaturdayRule } from "@/lib/entity/settings";
import { cn } from "@/lib/utils/utils";

const PATTERNS = [
  { value: "every", label: "Todos", desc: "Abre todos los sábados", icon: CalendarDays },
  { value: "alternate", label: "Alternos", desc: "Uno sí, uno no", icon: Repeat },
  { value: "custom", label: "Personalizado", desc: "Secuencia libre", icon: Settings2 },
] as const;

const SHIFT_COLORS: Record<string, string> = {
  A: "bg-brand/15 text-brand border-brand/30",
  B: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  off: "bg-hover text-subtle border-hairline",
};

const DEFAULT_SHIFT_A = { startTime: "08:00", endTime: "14:00" };
const DEFAULT_SHIFT_B = { startTime: "08:00", endTime: "18:00" };

interface SaturdayConfigPanelProps {
  disabled?: boolean;
}

export function SaturdayConfigPanel({ disabled = false }: SaturdayConfigPanelProps) {
  const { control, setValue, getValues } = useFormContext<GeneralSettingsFormValues>();
  const saturday = useWatch({ control, name: "schedule.saturday" });
  const enabled = !!saturday?.enabled;

  const rule: SaturdayRule | null = (saturday as any)?.saturdayRule ?? null;
  const pattern = rule?.pattern ?? "every";
  const shifts = rule?.shifts ?? { A: DEFAULT_SHIFT_A };
  const sequence = rule?.sequence ?? ["A"];
  const anchorDate = rule?.anchorDate ?? getNextSaturday();

  const cardStatus: ScheduleDayStatus = enabled ? "open" : "clinic-closed";

  const updateRule = useCallback((partial: Partial<SaturdayRule>) => {
    const current: SaturdayRule = {
      pattern,
      anchorDate,
      shifts,
      sequence,
      ...partial,
    };
    setValue("schedule.saturday.saturdayRule" as any, current, {
      shouldDirty: true,
    });
  }, [pattern, anchorDate, shifts, sequence, setValue]);

  const setEnabled = (next: boolean) => {
    if (next) {
      // Pre-fill default hours
      const day = getValues("schedule.saturday");
      if (!day?.startTime) setValue("schedule.saturday.startTime", "08:00", { shouldDirty: true });
      if (!day?.endTime) setValue("schedule.saturday.endTime", "14:00", { shouldDirty: true });
      // Set default rule if none
      if (!(day as any)?.saturdayRule) {
        setValue("schedule.saturday.saturdayRule" as any, {
          pattern: "every",
          anchorDate: getNextSaturday(),
          shifts: { A: DEFAULT_SHIFT_A },
          sequence: ["A"],
        }, { shouldDirty: true });
      }
    }
    setValue("schedule.saturday.enabled", next, { shouldDirty: true, shouldValidate: true });
  };

  const selectPattern = (p: typeof pattern) => {
    let newSeq: string[];
    let newShifts = { ...shifts };
    switch (p) {
      case "every":
        newSeq = ["A"];
        break;
      case "alternate":
        newSeq = ["A", "off"];
        break;
      case "custom":
        newSeq = sequence.length > 1 ? sequence : ["A", "A", "off", "off"];
        if (!newShifts.B) newShifts = { ...newShifts, B: DEFAULT_SHIFT_B };
        break;
      default:
        newSeq = ["A"];
    }
    updateRule({ pattern: p, sequence: newSeq, shifts: newShifts });
  };

  const updateShift = (key: string, field: "startTime" | "endTime", value: string) => {
    const newShifts = { ...shifts, [key]: { ...shifts[key], [field]: value } };
    updateRule({ shifts: newShifts });
    // Also update the top-level startTime/endTime to satisfy schema validation
    if (key === "A" && field === "startTime") setValue("schedule.saturday.startTime", value, { shouldDirty: true });
    if (key === "A" && field === "endTime") setValue("schedule.saturday.endTime", value, { shouldDirty: true });
  };

  const toggleSequenceSlot = (index: number) => {
    if (pattern !== "custom") return;
    const newSeq = [...sequence];
    const shiftKeys = Object.keys(shifts);
    const current = newSeq[index];
    // Cycle: A → B → off → A (or A → off → A if no B)
    if (current === "off") {
      newSeq[index] = "A";
    } else {
      const currentIdx = shiftKeys.indexOf(current);
      if (currentIdx < shiftKeys.length - 1) {
        newSeq[index] = shiftKeys[currentIdx + 1];
      } else {
        newSeq[index] = "off";
      }
    }
    updateRule({ sequence: newSeq });
  };

  const addSequenceSlot = () => {
    if (pattern !== "custom") return;
    updateRule({ sequence: [...sequence, "off"] });
  };

  const removeSequenceSlot = () => {
    if (pattern !== "custom" || sequence.length <= 2) return;
    updateRule({ sequence: sequence.slice(0, -1) });
  };

  // Preview: compute which Saturdays are open/closed based on the rule
  const preview = useMemo(() => {
    if (!enabled || !rule) return [];
    const anchor = new Date(anchorDate + "T12:00:00");
    const items: Array<{ date: string; shiftKey: string; open: boolean }> = [];
    const today = new Date();
    // Show next 6 Saturdays
    let sat = new Date(today);
    sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7 || 7));
    for (let i = 0; i < 6; i++) {
      const weeksDiff = Math.round((sat.getTime() - anchor.getTime()) / (7 * 86400000));
      let pos: number;
      if (pattern === "every") {
        pos = 0;
      } else {
        pos = ((weeksDiff % sequence.length) + sequence.length) % sequence.length;
      }
      const shiftKey = sequence[pos] ?? "off";
      items.push({
        date: sat.toISOString().slice(0, 10),
        shiftKey,
        open: shiftKey !== "off" && !!shifts[shiftKey],
      });
      sat = new Date(sat.getTime() + 7 * 86400000);
    }
    return items;
  }, [enabled, rule, anchorDate, pattern, sequence, shifts]);

  const hasMultipleShifts = Object.keys(shifts).length > 1 || pattern === "custom";

  return (
    <ScheduleDayCard
      status={cardStatus}
      toggleSlot={
        <DayToggle
          label="Sábado"
          status={enabled ? "active" : "clinic-closed"}
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={disabled}
        />
      }
    >
      {enabled ? (
        <div className="space-y-4">
          {/* Pattern selector */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-subtle">Patrón de sábados</div>
            <div className="flex gap-2">
              {PATTERNS.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectPattern(value)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-all duration-150",
                    pattern === value
                      ? "border-brand bg-brand/10 text-brand shadow-sm"
                      : "border-hairline bg-surface text-subtle hover:border-brand/30 hover:bg-brand/5",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{label}</span>
                  <span className="text-[10px] leading-tight opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shift hours */}
          <div className={cn("grid gap-3", hasMultipleShifts ? "grid-cols-2" : "grid-cols-1")}>
            {Object.entries(shifts).map(([key, shift]) => (
              <div key={key} className="space-y-1">
                {hasMultipleShifts && (
                  <div className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    SHIFT_COLORS[key] ?? SHIFT_COLORS.A,
                  )}>
                    Turno {key}
                  </div>
                )}
                <TimeRangeField
                  heading={hasMultipleShifts ? undefined : "Horario de Consulta"}
                  startLabel="Desde"
                  endLabel="Hasta"
                  start={{
                    value: shift.startTime,
                    onChange: (v) => updateShift(key, "startTime", v),
                    ariaLabel: `Sábado turno ${key}: apertura`,
                  }}
                  end={{
                    value: shift.endTime,
                    onChange: (v) => updateShift(key, "endTime", v),
                    ariaLabel: `Sábado turno ${key}: cierre`,
                  }}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>

          {/* Sequence editor (alternate & custom) */}
          {pattern !== "every" && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-subtle">
                Secuencia del ciclo
                {pattern === "custom" && (
                  <span className="ml-1 font-normal opacity-70">(click para cambiar)</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {sequence.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled || pattern !== "custom"}
                    onClick={() => toggleSequenceSlot(i)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition-all",
                      SHIFT_COLORS[slot] ?? SHIFT_COLORS.off,
                      pattern === "custom" && !disabled && "cursor-pointer hover:scale-110",
                      (pattern !== "custom" || disabled) && "cursor-default",
                    )}
                    title={slot === "off" ? "Cerrado" : `Turno ${slot}`}
                  >
                    {slot === "off" ? "—" : slot}
                  </button>
                ))}
                {pattern === "custom" && !disabled && (
                  <>
                    <button
                      type="button"
                      onClick={addSequenceSlot}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-hairline text-subtle hover:border-brand hover:text-brand transition-colors"
                      title="Agregar semana"
                    >
                      +
                    </button>
                    {sequence.length > 2 && (
                      <button
                        type="button"
                        onClick={removeSequenceSlot}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-hairline text-subtle hover:border-red-400 hover:text-red-400 transition-colors"
                        title="Quitar última semana"
                      >
                        −
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Anchor date */}
          {pattern !== "every" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-subtle">
                Inicio del ciclo
                <span className="ml-1 font-normal opacity-70">(primer sábado de referencia)</span>
              </label>
              <input
                type="date"
                value={anchorDate}
                onChange={(e) => updateRule({ anchorDate: e.target.value })}
                disabled={disabled}
                className={cn(
                  "h-9 w-full max-w-[200px] rounded-lg border border-hairline bg-surface px-3 text-sm text-ink",
                  "focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40",
                  disabled && "opacity-50",
                )}
              />
            </div>
          )}

          {/* Preview strip */}
          {preview.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-subtle">
                <Calendar className="h-3.5 w-3.5" />
                Próximos sábados
              </div>
              <div className="flex gap-1.5">
                {preview.map((item) => {
                  const d = new Date(item.date + "T12:00:00");
                  const dayNum = d.getDate();
                  const month = d.toLocaleDateString("es", { month: "short" });
                  return (
                    <div
                      key={item.date}
                      className={cn(
                        "flex flex-col items-center rounded-lg border px-2.5 py-1.5 text-center transition-colors",
                        item.open
                          ? SHIFT_COLORS[item.shiftKey] ?? SHIFT_COLORS.A
                          : "border-hairline bg-hover/60 text-muted-foreground",
                      )}
                    >
                      <span className="text-[10px] uppercase leading-tight opacity-70">{month}</span>
                      <span className="text-sm font-bold leading-tight">{dayNum}</span>
                      <span className="text-[9px] font-medium leading-tight">
                        {item.open ? item.shiftKey : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-amber-400/40 bg-amber-500/[0.04] px-4 py-3 text-center text-xs text-amber-600 dark:text-amber-400">
          Activa los sábados y configura el patrón de apertura.
        </div>
      )}
    </ScheduleDayCard>
  );
}

function getNextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
