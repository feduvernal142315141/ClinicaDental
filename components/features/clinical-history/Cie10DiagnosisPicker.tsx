"use client";

/**
 * Cie10DiagnosisPicker — selector de diagnóstico CIE-10 con búsqueda y
 * sugerencias del odontograma (ICDAS→CIE-10).
 *
 * Features:
 *  - Campo de búsqueda debounced → resultados del catálogo dental
 *  - Sugerencias de un toque a partir de hallazgos ICDAS del odontograma
 *  - Lista de diagnósticos activos con badge provisional/confirmado
 *  - Toggle de estado por diagnóstico + botón de eliminar
 */

import { useState, useCallback, useRef, useId, useEffect } from "react";
import { Search, Plus, X, CircleCheck, Clock, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { searchCie10 } from "@/lib/entity/clinical-history/cie10-dental";
import { cie10ToVisitDiagnosis } from "@/lib/entity/clinical-history/cie10-dental";
import type { VisitDiagnosis, DiagnosisStatus } from "@/lib/entity/clinical-history";
import type { Cie10DentalCode } from "@/lib/entity/clinical-history/cie10-dental";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Cie10DiagnosisPickerProps {
  /** Lista actual de diagnósticos de la visita. */
  diagnoses: VisitDiagnosis[];
  /** Sugerencias ICDAS calculadas por el hook (ya convertidas a VisitDiagnosis). */
  icdasSuggestions: VisitDiagnosis[];
  /** Añadir un diagnóstico. */
  onAdd: (dx: VisitDiagnosis) => void;
  /** Eliminar un diagnóstico por código + posición (para códigos duplicados). */
  onRemove: (index: number) => void;
  /** Cambiar el estado provisional/confirmado. */
  onToggleStatus: (index: number) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<DiagnosisStatus, string> = {
  provisional: "Provisional",
  confirmed: "Confirmado",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Cie10DiagnosisPicker({
  diagnoses,
  icdasSuggestions,
  onAdd,
  onRemove,
  onToggleStatus,
  disabled = false,
}: Cie10DiagnosisPickerProps) {
  const uid = useId();
  const listId = `cie10-results-${uid}`;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Cie10DentalCode[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setResults(searchCie10(q));
      setOpen(true);
    }, 220);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleSelect = useCallback(
    (code: Cie10DentalCode) => {
      if (disabled) return;
      onAdd(cie10ToVisitDiagnosis(code, { source: "manual" }));
      setQuery("");
      setResults([]);
      setOpen(false);
      inputRef.current?.focus();
    },
    [disabled, onAdd],
  );

  const handleAddSuggestion = useCallback(
    (sug: VisitDiagnosis) => {
      if (disabled) return;
      onAdd(sug);
    },
    [disabled, onAdd],
  );

  // Filter suggestions to exclude already-added codes
  const addedCodes = new Set(diagnoses.map((d) => d.code));
  const pendingSuggestions = icdasSuggestions.filter((s) => !addedCodes.has(s.code));

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div ref={rootRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
            disabled={disabled}
            placeholder="Buscar código CIE-10 o descripción…"
            aria-label="Buscar diagnóstico CIE-10"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            className={cn(
              "w-full rounded-xl border border-hairline bg-elevated pl-9 pr-3 py-2 text-sm text-ink outline-none transition-colors",
              "placeholder:text-subtle",
              "focus:border-brand focus:ring-2 focus:ring-brand/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
              open && "border-brand ring-2 ring-brand/30",
            )}
          />
        </div>

        {/* Results dropdown */}
        {open && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Resultados de búsqueda CIE-10"
            className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-hairline bg-surface shadow-bento py-1"
          >
            {results.map((r) => {
              const alreadyAdded = addedCodes.has(r.code);
              return (
                <li
                  key={r.code}
                  role="option"
                  aria-selected={alreadyAdded}
                  onClick={() => !alreadyAdded && handleSelect(r)}
                  onMouseDown={(e) => e.preventDefault()}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2 text-sm transition-colors cursor-pointer",
                    alreadyAdded
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-hover text-ink",
                  )}
                >
                  <span className="font-mono text-xs font-bold text-brand shrink-0 pt-0.5">
                    {r.code}
                  </span>
                  <span className="flex-1 leading-snug">{r.label}</span>
                  {!alreadyAdded && (
                    <Plus className="h-4 w-4 shrink-0 text-subtle mt-0.5" />
                  )}
                  {alreadyAdded && (
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ICDAS suggestions from odontogram */}
      {pendingSuggestions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Sugerencias del odontograma
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingSuggestions.map((sug, i) => (
              <button
                key={`${sug.code}-${sug.toothRef?.fdi ?? i}`}
                type="button"
                disabled={disabled}
                onClick={() => handleAddSuggestion(sug)}
                aria-label={`Agregar diagnóstico sugerido ${sug.code} ${sug.label}${sug.toothRef ? ` (diente ${sug.toothRef.fdi})` : ""}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors",
                  "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 hover:border-amber-400",
                  "dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <span className="font-mono">{sug.code}</span>
                {sug.toothRef && (
                  <span className="text-[10px] opacity-70">#{sug.toothRef.fdi}</span>
                )}
                <Plus className="h-3 w-3 opacity-60" />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-amber-700/70 dark:text-amber-400/60">
            Diagnósticos provisionales basados en hallazgos ICDAS del odontograma.
          </p>
        </div>
      )}

      {/* Current diagnoses list */}
      {diagnoses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Diagnósticos registrados ({diagnoses.length})
          </p>
          <ul className="space-y-1.5" aria-label="Diagnósticos de la visita">
            {diagnoses.map((dx, index) => (
              <li
                key={`${dx.code}-${index}`}
                className="flex items-start gap-2 rounded-xl border border-hairline bg-elevated px-3 py-2"
              >
                {/* Status badge + toggle */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleStatus(index)}
                  title={`Estado: ${STATUS_LABEL[dx.status]}. Clic para cambiar.`}
                  aria-label={`Cambiar estado de ${dx.code}: actualmente ${STATUS_LABEL[dx.status]}`}
                  className={cn(
                    "shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border transition-colors",
                    dx.status === "confirmed"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
                      : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {dx.status === "confirmed" ? (
                    <CircleCheck className="h-2.5 w-2.5" />
                  ) : (
                    <Clock className="h-2.5 w-2.5" />
                  )}
                  {STATUS_LABEL[dx.status]}
                </button>

                {/* Code + label */}
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs font-bold text-brand">{dx.code}</span>
                  <span className="text-xs text-ink ml-1.5">{dx.label}</span>
                  {dx.toothRef && (
                    <span className="ml-1.5 text-[10px] text-subtle font-mono">
                      #{dx.toothRef.fdi}
                      {dx.toothRef.surface ? `-${dx.toothRef.surface}` : ""}
                    </span>
                  )}
                  {dx.source === "odontogram" && (
                    <span className="ml-1.5 text-[9px] text-amber-600 dark:text-amber-400">
                      [odontograma]
                    </span>
                  )}
                </div>

                {/* Remove */}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                  aria-label={`Eliminar diagnóstico ${dx.code}`}
                  className="shrink-0 rounded p-0.5 text-subtle hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {diagnoses.length === 0 && pendingSuggestions.length === 0 && (
        <p className="text-xs text-subtle text-center py-2">
          Sin diagnósticos. Busca un código CIE-10 para agregar.
        </p>
      )}
    </div>
  );
}
