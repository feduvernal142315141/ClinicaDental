"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Select } from "@/components/ui/controls/select";

export interface TimeFieldProps {
  /** Hora "HH:mm" (o "" si vacío). */
  value: string;
  onChange: (value: string) => void;
  /** Paso de minutos en el selector (def. 5). */
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
  onBlur?: () => void;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: pad(i), label: pad(i) }));

/**
 * TimeField corporativo (HH:mm) sin controles nativos ni Ant Design. Trigger
 * Bento + popover con dos `Select` (hora / minuto). Reemplaza al antd TimePicker.
 * Controlado: value/onChange string "HH:mm". forwardRef → integra con FormControl.
 */
export const TimeField = React.forwardRef<HTMLButtonElement, TimeFieldProps>(
  function TimeField(
    {
      value,
      onChange,
      minuteStep = 5,
      disabled = false,
      className,
      id,
      onBlur,
      "aria-label": ariaLabel,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedby,
    },
    forwardedRef,
  ) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const setTriggerRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const hasValue = !!value && value.includes(":");
    const [hh, mm] = hasValue ? value.split(":") : ["", ""];

    const minutes = React.useMemo(() => {
      const step = minuteStep > 0 ? minuteStep : 5;
      const arr: { value: string; label: string }[] = [];
      for (let m = 0; m < 60; m += step) arr.push({ value: pad(m), label: pad(m) });
      // Incluye el minuto actual aunque no caiga en el paso (datos legacy).
      if (mm && !arr.some((o) => o.value === mm)) {
        arr.push({ value: mm, label: mm });
        arr.sort((a, b) => a.value.localeCompare(b.value));
      }
      return arr;
    }, [minuteStep, mm]);

    const setPart = (h: string, m: string) => {
      onChange(`${h || hh || "00"}:${m || mm || "00"}`);
    };

    React.useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    return (
      <div
        ref={rootRef}
        className={cn("relative", className)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
        onBlur={(e) => {
          // Cierra y valida (field.onBlur) sólo cuando el foco sale del control.
          if (!rootRef.current?.contains(e.relatedTarget as Node | null)) {
            setOpen(false);
            onBlur?.();
          }
        }}
      >
        <div
          className={cn(
            "flex w-full items-center gap-2 rounded-xl border bg-elevated px-3 py-2.5 text-sm transition-colors",
            open ? "border-brand ring-2 ring-brand/30" : "border-hairline",
            ariaInvalid && "border-rose-500/60",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-subtle" />
          <button
            ref={setTriggerRef}
            type="button"
            id={id}
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className={cn(
              "flex-1 truncate text-left outline-none tabular-nums",
              hasValue ? "text-ink" : "text-subtle",
            )}
          >
            {hasValue ? value : "--:--"}
          </button>
        </div>

        {open && (
          <div
            role="dialog"
            aria-label={ariaLabel ?? "Seleccionar hora"}
            className="absolute left-0 z-50 mt-2 flex w-44 items-center gap-2 rounded-xl border border-hairline bg-elevated p-2 shadow-bento"
          >
            <div className="flex-1">
              <Select
                value={hh || "00"}
                onChange={(h) => setPart(h, mm)}
                options={HOURS}
                aria-label="Hora"
              />
            </div>
            <span className="text-subtle">:</span>
            <div className="flex-1">
              <Select
                value={mm || "00"}
                onChange={(m) => setPart(hh, m)}
                options={minutes}
                aria-label="Minutos"
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);
