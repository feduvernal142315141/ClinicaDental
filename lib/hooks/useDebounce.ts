import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Devuelve una copia **debounced** de `value`: solo se actualiza cuando `value`
 * deja de cambiar durante `delay` ms. Pensado para un término de búsqueda que
 * alimenta un fetch — el input se mantiene instantáneo (bindeado a `value`) y la
 * consulta se difiere. Uso típico:
 *
 * ```ts
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebouncedValue(search, 350);
 * useEffect(() => { fetchX({ q: debouncedSearch.trim() }); }, [debouncedSearch]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Devuelve una función **estable** que difiere la ejecución de `callback` hasta
 * que pasen `delay` ms sin volver a invocarla (coalesce de llamadas rápidas).
 * Cancela el timer pendiente al desmontar y siempre ejecuta la última versión de
 * `callback` (sin cerrar sobre valores obsoletos). Uso típico para debouncear una
 * acción/emisión (no un valor):
 *
 * ```ts
 * const setFilters = useDebouncedCallback(setSemanticFilters, 500);
 * // <input onChange={e => setFilters({ ...filters, name: e.target.value })} />
 * ```
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay = 350,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}
