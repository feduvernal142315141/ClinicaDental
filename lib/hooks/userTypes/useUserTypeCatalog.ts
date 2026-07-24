"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { userTypesService } from "@/lib/services/userTypes";
import type { UserType } from "@/lib/entity/userType";
import { notifyApiError } from "@/lib/utils/notify-error";
import { matchesQuery } from "@/lib/utils/text";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";

/** Primera carga: si el total cabe aquí, el catálogo queda completo en cliente. */
export const CATALOG_PAGE_SIZE = 200;

const SEARCH_DEBOUNCE_MS = 300;

// ── useUserTypeCatalog ───────────────────────────────────────────────────────
/**
 * Catálogo de tipos de usuario con estrategia híbrida (misma que
 * etiquetas/doctores/servicios):
 * - Primera carga: page 0 / pageSize 200. Si `total <= 200` el catálogo queda
 *   completo en cliente (`isComplete`) y la búsqueda es instantánea (client-side,
 *   `matchesQuery`).
 * - Si `total > 200`, la búsqueda pasa a servidor
 *   (filters=name__CONTAINS_IGNORE_CASE__q, insensible a mayúsculas/acentos
 *   como matchesQuery, debounce ~300ms) y `loadMore()` pagina incremental.
 *
 * Errores siempre vía `notifyApiError` (no reintroducir catch silenciosos).
 */
export function useUserTypeCatalog(includeArchived = false) {
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [serverResults, setServerResults] = useState<UserType[] | null>(null);

  const pageRef = useRef(0);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const isComplete = total <= userTypes.length;

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      setLoading(true);
      try {
        const { entities, pagination } = await userTypesService.getUserTypesPage({
          includeArchived,
          page,
          pageSize: CATALOG_PAGE_SIZE,
        });
        setTotal(pagination?.total ?? entities.length);
        pageRef.current = page;
        setUserTypes((prev) => (append ? [...prev, ...entities] : entities));
      } catch (error) {
        notifyApiError("No se pudieron cargar los tipos de usuario", error);
      } finally {
        setLoading(false);
      }
    },
    [includeArchived],
  );

  // Carga inicial (y cuando cambia includeArchived).
  useEffect(() => {
    pageRef.current = 0;
    setServerResults(null);
    fetchPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  // Búsqueda server-side (solo cuando el catálogo NO está completo en cliente).
  useEffect(() => {
    if (isComplete) {
      setServerResults(null);
      return;
    }
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setServerResults(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { entities } = await userTypesService.getUserTypesPage({
          query: trimmed,
          includeArchived,
          page: 0,
          pageSize: CATALOG_PAGE_SIZE,
        });
        if (!cancelled) setServerResults(entities);
      } catch (error) {
        if (!cancelled) notifyApiError("No se pudieron cargar los tipos de usuario", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isComplete, includeArchived]);

  const search = useCallback((next: string) => {
    setQuery(next);
  }, []);

  const results = useMemo(() => {
    if (isComplete) {
      const trimmed = query.trim();
      if (!trimmed) return userTypes;
      return userTypes.filter((t) => matchesQuery(t.name, trimmed));
    }
    if (!query.trim()) return userTypes;
    return serverResults ?? userTypes;
  }, [isComplete, userTypes, query, serverResults]);

  const loadMore = useCallback(() => {
    if (isComplete || loading) return;
    fetchPage(pageRef.current + 1, true);
  }, [isComplete, loading, fetchPage]);

  const refetch = useCallback(() => {
    pageRef.current = 0;
    return fetchPage(0, false);
  }, [fetchPage]);

  return {
    userTypes,
    total,
    isComplete,
    loading,
    search,
    results,
    query,
    loadMore,
    refetch,
  };
}
