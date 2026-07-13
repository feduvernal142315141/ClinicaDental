import { useState, useCallback, useEffect } from "react";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";

/**
 * usePatientFilters
 *
 * Manages a single search string with debounced emission.
 *
 * Fase 2 (GET semántico): el hook ya NO arma `?filters=` (columnas/operadores/
 * separador). Emite INTENCIÓN plana `{ q }` y el backend resuelve el significado
 * server-side (barre name + email). El cliente tipado Fase 1 (`patientsQuery`)
 * queda disponible para orden u otros usos durante la coexistencia.
 *
 * @example
 * const { search, setSearch, clearSearch, hasActiveFilters } =
 *   usePatientFilters(({ q }) => fetchPatients({ page: 0, q }));
 */
export function usePatientFilters(
  onChange: (params: { q: string }) => void,
  debounceMs = 350,
) {
  const [search, setSearchState] = useState("");

  const hasActiveFilters = search.trim() !== "";

  const debouncedSearch = useDebouncedValue(search, debounceMs);
  useEffect(() => {
    onChange({ q: debouncedSearch.trim() });
  }, [debouncedSearch, onChange]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
  }, []);

  const clearSearch = useCallback(() => setSearchState(""), []);

  return { search, setSearch, clearSearch, hasActiveFilters };
}
