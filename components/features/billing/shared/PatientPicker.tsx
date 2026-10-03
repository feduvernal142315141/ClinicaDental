"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, Search, UserRound, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { usePatientSearch } from "@/lib/hooks/billing";
import { cn } from "@/lib/utils/utils";

interface PatientPickerProps {
  value: string;
  /** Nombre a mostrar del paciente ya elegido (si se conoce). */
  selectedName?: string | null;
  onChange: (patient: { id: string; name: string } | null) => void;
  /** Paciente fijo (abierto desde su ficha o desde un recibo): no se puede cambiar. */
  locked?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
}

/** Selector de paciente con búsqueda (mínimo 2 caracteres, 300 ms de espera). */
export function PatientPicker({ value, selectedName, onChange, locked, invalid, onBlur }: PatientPickerProps) {
  const listId = useId();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const search = usePatientSearch(debounced);

  if (value) {
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-hairline bg-elevated px-3">
        <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
          <UserRound className="h-4 w-4 shrink-0 text-subtle" />
          <span className="truncate">{selectedName ?? "Paciente seleccionado"}</span>
        </span>
        {!locked && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Cambiar paciente">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  const results = search.data ?? [];
  const showList = open && debounced.trim().length >= 2;

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      <Input
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
          onBlur?.();
        }}
        placeholder="Buscar paciente por nombre o teléfono…"
        className={cn("pl-9", invalid && "border-rose-500")}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-invalid={invalid}
        aria-label="Paciente"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-hairline bg-surface p-1 shadow-lg"
        >
          {search.isFetching && results.length === 0 && (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-subtle">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando pacientes…
            </li>
          )}
          {!search.isFetching && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-subtle">No se encontraron pacientes.</li>
          )}
          {results.map((patient) => (
            <li key={patient.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-hover"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({ id: patient.id, name: patient.name });
                  setTerm("");
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium text-ink">{patient.name}</span>
                {patient.phone && <span className="text-xs text-subtle">{patient.phone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
