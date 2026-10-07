"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/lib/hooks/billing/use-debounced-value";
import {
  EMPTY_LEAD_FILTERS,
  parseLeadFilters,
  parseLeadPage,
  parseLeadView,
  serializeLeadFilters,
  toLeadApiFilters,
  type LeadFilterState,
  type LeadView,
} from "./lead-filters";

/**
 * Filtros, vista (tablero o lista) y página reflejados en la URL: se pueden compartir y
 * sobreviven al recargar. La búsqueda se escribe al instante y viaja a la URL con retardo.
 */
export function useLeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(() => parseLeadFilters(searchParams), [searchParams]);
  const view = useMemo(() => parseLeadView(searchParams), [searchParams]);
  const page = useMemo(() => parseLeadPage(searchParams), [searchParams]);

  const push = useCallback(
    (next: LeadFilterState, nextView: LeadView, nextPage: number) => {
      const query = serializeLeadFilters(next, nextView, nextPage);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Búsqueda: estado local inmediato + escritura diferida en la URL.
  const [search, setSearch] = useState(state.q);
  const debouncedSearch = useDebouncedValue(search, 350);
  useEffect(() => {
    if (debouncedSearch.trim() !== state.q.trim()) push({ ...state, q: debouncedSearch }, view, 0);
    // Solo reacciona al texto ya estabilizado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const update = useCallback(
    (patch: Partial<LeadFilterState>) => push({ ...state, q: search, ...patch }, view, 0),
    [push, state, search, view],
  );

  const reset = useCallback(() => {
    setSearch("");
    push(EMPTY_LEAD_FILTERS, view, 0);
  }, [push, view]);

  const setView = useCallback(
    (nextView: LeadView) => push({ ...state, q: search }, nextView, 0),
    [push, state, search],
  );

  const setPage = useCallback(
    (nextPage: number) => push({ ...state, q: search }, view, nextPage),
    [push, state, search, view],
  );

  const boardFilters = useMemo(() => toLeadApiFilters(state), [state]);
  const listFilters = useMemo(() => toLeadApiFilters(state, { includeStage: true }), [state]);

  return { state, search, setSearch, update, reset, view, setView, page, setPage, boardFilters, listFilters };
}
