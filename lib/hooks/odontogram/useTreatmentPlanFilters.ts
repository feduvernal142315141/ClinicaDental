"use client";

import { useCallback, useMemo, useState } from "react";
import {
  PLAN_ITEM_DISPLAY_STATUSES,
  type PlanItemDisplayStatus,
} from "@/lib/entity/odontogram";
import type { PlanItemRow } from "./useTreatmentPlanBoard";

/** Valor "sin filtro" de los tres controles de la barra. */
export const ALL_FILTER_VALUE = "all";

/**
 * Valor del desplegable de fase para las líneas SIN fase asignada.
 * No puede ser `""`: el `Select` compartido trata la cadena vacía como "nada
 * seleccionado" y pintaría el placeholder sobre un filtro que sí está activo.
 */
export const NO_PHASE_VALUE = "none";

/** Ámbito del segmentado: el mismo eje con el que el servidor agrupa. */
export type PlanScopeFilter = "all" | "tooth" | "general";

export interface PlanBoardFilters {
  scope: PlanScopeFilter;
  /** {@link ALL_FILTER_VALUE}, {@link NO_PHASE_VALUE} o la fase en texto ("2"). */
  phase: string;
  /** {@link ALL_FILTER_VALUE} o un `PlanItemDisplayStatus`. */
  status: string;
}

/** Una opción de los desplegables, con cuántas líneas del plan le corresponden. */
export interface PlanFilterOption {
  value: string;
  /**
   * Líneas del plan con ese valor. Se cuenta sobre el plan ENTERO, no sobre lo
   * que queda tras los otros filtros: los contadores son el mapa del plan y, si
   * bailaran con cada filtro, dejarían de servir para decidir dónde mirar (misma
   * decisión que los chips de categoría del catálogo, `buildCategoryChips`).
   */
  count: number;
}

export interface UseTreatmentPlanFiltersResult {
  filters: PlanBoardFilters;
  setScope: (scope: PlanScopeFilter) => void;
  setPhase: (phase: string) => void;
  setStatus: (status: string) => void;
  /** Devuelve los tres controles a "sin filtro". */
  clearFilters: () => void;
  /** `true` si algún control filtra algo. */
  filtersActive: boolean;
  /** Filas que pasan los tres filtros, en el orden en que llegaron. */
  visibleRows: PlanItemRow[];
  /** Filas del plan que los filtros dejan fuera de la tabla. */
  hiddenCount: number;
  phaseOptions: PlanFilterOption[];
  statusOptions: PlanFilterOption[];
}

const NO_FILTERS: PlanBoardFilters = {
  scope: ALL_FILTER_VALUE,
  phase: ALL_FILTER_VALUE,
  status: ALL_FILTER_VALUE,
};

/** `2` → `"2"`; sin fase → {@link NO_PHASE_VALUE}. Clave del desplegable. */
function phaseKey(phase: number | null | undefined): string {
  return typeof phase === "number" ? String(phase) : NO_PHASE_VALUE;
}

/**
 * Ordena las opciones de fase: 1, 2, 3… y "sin fase" AL FINAL.
 * Sin esto `NO_PHASE_VALUE` caería donde lo pusiera el orden de aparición de las
 * líneas, y una lista de fases que empieza por "Sin fase" no se lee como una
 * secuencia de tratamiento.
 */
function comparePhaseKeys(a: string, b: string): number {
  if (a === NO_PHASE_VALUE) return 1;
  if (b === NO_PHASE_VALUE) return -1;
  return Number(a) - Number(b);
}

/**
 * Cuenta valores y devuelve las opciones, garantizando que el valor ACTIVO
 * siempre esté en la lista aunque ya no le quede ninguna línea.
 *
 * Hace falta porque el plan cambia bajo el filtro: con el filtro en "Propuesto",
 * aceptar la última línea propuesta borraría esa opción de la lista y el `Select`
 * se quedaría con un valor que no existe entre sus opciones — o sea, enseñando
 * el placeholder ("Todos") sobre una tabla vacía, sin nada en pantalla que
 * explique por qué no hay filas. Con la opción presente y a 0, el control sigue
 * diciendo la verdad y se puede deshacer el filtro.
 */
function buildOptions(
  counts: Map<string, number>,
  activeValue: string,
  sort: (a: string, b: string) => number,
): PlanFilterOption[] {
  if (activeValue !== ALL_FILTER_VALUE && !counts.has(activeValue)) {
    counts.set(activeValue, 0);
  }
  return Array.from(counts.keys())
    .sort(sort)
    .map((value) => ({ value, count: counts.get(value) ?? 0 }));
}

/**
 * useTreatmentPlanFilters
 *
 * Filtro EN CLIENTE de las líneas ya cargadas del plan: ámbito (todas / por
 * pieza / generales), fase y estado. No pide nada al servidor — el plan entero
 * ya está en memoria y una ida y vuelta por cada clic de un desplegable sería
 * peor en todo.
 *
 * Los desplegables solo ofrecen valores QUE EXISTEN en el plan: una clínica que
 * nunca fasea no ve un desplegable de fases con seis opciones vacías, y un
 * estado con 0 líneas es una vía muerta. La única excepción es el valor activo,
 * que se mantiene aunque se quede a cero (ver `buildOptions`).
 *
 * Lo que este hook NO hace: tocar importes. Filtrar cambia QUÉ FILAS se ven, no
 * el presupuesto; el `total` que pinta el pie de la tabla sigue siendo el del
 * servidor, con las líneas ocultas incluidas. Por eso expone `hiddenCount`: la
 * vista tiene que decir cuántas filas quedan fuera o el total no cuadrará con lo
 * que se ve.
 *
 * @param rows todas las líneas del plan, ya parseadas y ordenadas.
 * @param resetKey al cambiar, los filtros vuelven a cero. Se le pasa el paciente:
 *   la ruta `/patients/[id]` no remonta este árbol al saltar de un paciente a
 *   otro, así que sin esto el plan del siguiente se abriría con el filtro del
 *   anterior puesto — "0 de 8 líneas" sobre un presupuesto que sí existe.
 */
export function useTreatmentPlanFilters(
  rows: PlanItemRow[],
  resetKey?: string | null,
): UseTreatmentPlanFiltersResult {
  const [filters, setFilters] = useState<PlanBoardFilters>(NO_FILTERS);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  // Durante el render y no en un efecto: un efecto corre tras el commit, así que
  // llegaría a pintarse un fotograma del plan nuevo ya filtrado por lo anterior.
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setFilters(NO_FILTERS);
  }

  const setScope = useCallback((scope: PlanScopeFilter) => {
    setFilters((prev) => ({ ...prev, scope }));
  }, []);
  const setPhase = useCallback((phase: string) => {
    setFilters((prev) => ({ ...prev, phase }));
  }, []);
  const setStatus = useCallback((status: string) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);
  const clearFilters = useCallback(() => setFilters(NO_FILTERS), []);

  const phaseOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = phaseKey(row.item.phase);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return buildOptions(counts, filters.phase, comparePhaseKeys);
  }, [rows, filters.phase]);

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key: string = row.item.displayStatus;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const order = (value: string) => {
      const index = PLAN_ITEM_DISPLAY_STATUSES.indexOf(
        value as PlanItemDisplayStatus,
      );
      // Un estado que este front todavía no conoce va al final en vez de
      // colarse el primero (`indexOf` devuelve -1).
      return index === -1 ? PLAN_ITEM_DISPLAY_STATUSES.length : index;
    };
    return buildOptions(counts, filters.status, (a, b) => order(a) - order(b));
  }, [rows, filters.status]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (filters.scope === "tooth" && row.item.general) return false;
      if (filters.scope === "general" && !row.item.general) return false;
      if (
        filters.phase !== ALL_FILTER_VALUE &&
        phaseKey(row.item.phase) !== filters.phase
      ) {
        return false;
      }
      if (
        filters.status !== ALL_FILTER_VALUE &&
        row.item.displayStatus !== filters.status
      ) {
        return false;
      }
      return true;
    });
  }, [rows, filters]);

  const filtersActive =
    filters.scope !== ALL_FILTER_VALUE ||
    filters.phase !== ALL_FILTER_VALUE ||
    filters.status !== ALL_FILTER_VALUE;

  return {
    filters,
    setScope,
    setPhase,
    setStatus,
    clearFilters,
    filtersActive,
    visibleRows,
    hiddenCount: rows.length - visibleRows.length,
    phaseOptions,
    statusOptions,
  };
}
