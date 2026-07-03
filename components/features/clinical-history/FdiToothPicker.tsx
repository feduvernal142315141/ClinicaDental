"use client";

/**
 * FdiToothPicker — selector compacto de diente FDI + cara anatómica.
 *
 * NO importa lib/odontogram internals. Usa los números FDI estándar de la
 * dentición adulta (ISO 3950) directamente en este archivo.
 *
 * Salida visual: "16-M" (diente FDI + inicial de cara) o "21" si solo diente.
 */

import { useState, useId, useRef, useEffect } from "react";
import { MapPin, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ToothRef } from "@/lib/entity/clinical-history";

// ---------------------------------------------------------------------------
// Constantes FDI (dentición adulta)
// ---------------------------------------------------------------------------

const FDI_QUADRANT: Record<string, number[]> = {
  "Superior derecho": [18, 17, 16, 15, 14, 13, 12, 11],
  "Superior izquierdo": [21, 22, 23, 24, 25, 26, 27, 28],
  "Inferior izquierdo": [31, 32, 33, 34, 35, 36, 37, 38],
  "Inferior derecho": [41, 42, 43, 44, 45, 46, 47, 48],
};

const SURFACE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "M", label: "Mesial" },
  { code: "D", label: "Distal" },
  { code: "F", label: "Facial" },
  { code: "L", label: "Lingual/Palat." },
  { code: "O", label: "Oclusal/Incis." },
];

/** Formatea la referencia para mostrar en el trigger: "16-M" o "16". */
function formatToothRef(ref: ToothRef | undefined): string | null {
  if (!ref) return null;
  return ref.surface ? `${ref.fdi}-${ref.surface}` : ref.fdi;
}

// ---------------------------------------------------------------------------
// Prop types
// ---------------------------------------------------------------------------

export interface FdiToothPickerProps {
  value: ToothRef | undefined;
  onChange: (ref: ToothRef | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FdiToothPicker({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Diente / cara…",
}: FdiToothPickerProps) {
  const uid = useId();
  const popoverId = `fdi-picker-${uid}`;

  const [open, setOpen] = useState(false);
  const [selectedFdi, setSelectedFdi] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedFdi(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    setSelectedFdi(null);
    setOpen((o) => !o);
  };

  const handleSelectTooth = (fdi: number) => {
    const fdiStr = String(fdi);
    if (selectedFdi === fdiStr) {
      // Second click on same tooth → confirm without surface
      onChange({ fdi: fdiStr });
      setOpen(false);
      setSelectedFdi(null);
    } else {
      setSelectedFdi(fdiStr);
    }
  };

  const handleSelectSurface = (surfaceCode: string) => {
    if (!selectedFdi) return;
    onChange({ fdi: selectedFdi, surface: surfaceCode });
    setOpen(false);
    setSelectedFdi(null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const display = formatToothRef(value);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label="Selector de diente FDI"
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border bg-elevated px-3 py-2 text-left text-sm text-ink outline-none transition-colors",
          "focus:border-brand focus:ring-2 focus:ring-brand/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open ? "border-brand ring-2 ring-brand/30" : "border-hairline",
        )}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-subtle" />
        <span className={cn("flex-1 font-mono text-xs", display ? "text-ink" : "text-subtle")}>
          {display ?? placeholder}
        </span>
        {display && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
            aria-label="Limpiar diente"
            className="rounded p-0.5 text-subtle hover:text-destructive transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-subtle transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Popover */}
      {open && (
        <div
          id={popoverId}
          className="absolute left-0 z-50 mt-1 w-max min-w-full rounded-xl border border-hairline bg-surface shadow-bento p-3"
        >
          {!selectedFdi ? (
            /* Step 1: cuadrícula de dientes */
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-2">
                Selecciona el diente
              </p>
              {Object.entries(FDI_QUADRANT).map(([label, teeth]) => (
                <div key={label}>
                  <p className="text-[9px] text-subtle mb-1">{label}</p>
                  <div className="flex flex-wrap gap-1">
                    {teeth.map((fdi) => {
                      const isActive = value?.fdi === String(fdi);
                      return (
                        <button
                          key={fdi}
                          type="button"
                          onClick={() => handleSelectTooth(fdi)}
                          aria-label={`Diente ${fdi}`}
                          className={cn(
                            "w-8 h-7 rounded-lg text-xs font-mono font-medium border transition-colors",
                            isActive
                              ? "bg-brand text-white border-brand"
                              : "bg-elevated border-hairline text-ink hover:border-brand hover:text-brand",
                          )}
                        >
                          {fdi}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-[9px] text-subtle mt-2">
                Haz clic una vez para ver caras, dos veces para solo diente.
              </p>
            </div>
          ) : (
            /* Step 2: selector de cara */
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setSelectedFdi(null)}
                  className="text-[10px] text-subtle hover:text-ink transition-colors underline underline-offset-2"
                >
                  ← Cambiar diente
                </button>
                <span className="text-xs font-mono font-semibold text-ink">
                  Diente {selectedFdi}
                </span>
              </div>
              <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-2">
                Cara anatómica (opcional)
              </p>
              <div className="grid grid-cols-1 gap-1">
                {SURFACE_OPTIONS.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => handleSelectSurface(s.code)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-ink border border-hairline bg-elevated hover:border-brand hover:text-brand transition-colors text-left"
                  >
                    <span className="font-mono text-xs font-bold w-4">{s.code}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onChange({ fdi: selectedFdi });
                    setOpen(false);
                    setSelectedFdi(null);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-subtle border border-hairline bg-elevated hover:border-brand hover:text-brand transition-colors text-left"
                >
                  <span className="font-mono text-xs w-4">—</span>
                  <span>Sin cara específica</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
