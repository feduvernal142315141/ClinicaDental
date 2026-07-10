import { useState, useCallback, useEffect } from "react";
import { buildFilter } from "@/lib/entity/patients";

/**
 * usePatientFilters
 *
 * Manages a single search string with debounced emission.
 * Calls `onFiltersChange` after `debounceMs` ms of inactivity with
 * a filter array ready to be passed to `fetchPatients`.
 *
 * Searches by patient name using CONTAINS_IGNORE_CASE (case-insensitive on backend).
 *
 * @example
 * const { search, setSearch, clearSearch, hasActiveFilters } =
 *   usePatientFilters((filters) => fetchPatients({ page: 0, filters }));
 */
export function usePatientFilters(
  onFiltersChange: (filters: string[]) => void,
  debounceMs = 350,
) {
  const [search, setSearchState] = useState("");

  const hasActiveFilters = search.trim() !== "";

  useEffect(() => {
    const timer = setTimeout(() => {
      const built: string[] = [];
      if (search.trim())
        built.push(buildFilter("name", "CONTAINS_IGNORE_CASE", search.trim()));
      onFiltersChange(built);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [search, debounceMs, onFiltersChange]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
  }, []);

  const clearSearch = useCallback(() => setSearchState(""), []);

  return { search, setSearch, clearSearch, hasActiveFilters };
}
