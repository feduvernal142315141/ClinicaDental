"use client";

import { Loader2 } from "lucide-react";
import { SearchInput } from "@/components/ui/atomic/forms/search-input";

interface PatientSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
}

/**
 * PatientSearchBar
 *
 * Barra de búsqueda para la tabla de pacientes.
 * Muestra un indicador de carga mientras el debounce está activo.
 */
export function PatientSearchBar({
  value,
  onChange,
  loading,
}: PatientSearchBarProps) {
  return (
    <div className="relative max-w-sm">
      <SearchInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar paciente por nombre..."
        aria-label="Buscar paciente"
        containerClassName="w-full"
      />
      {loading && (
        <Loader2
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-subtle"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
