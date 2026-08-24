"use client";

import { useCallback, useMemo } from "react";
import {
  usePatientTreatmentPlan,
  type UsePatientTreatmentPlanResult,
} from "./usePatientTreatmentPlan";
import {
  useTreatmentPlanItems,
  type TreatmentPlanItemsTotals,
} from "./useTreatmentPlanItems";
import {
  useTreatmentPlanFilters,
  type UseTreatmentPlanFiltersResult,
} from "./useTreatmentPlanFilters";
import { notifyApiError } from "@/lib/utils/notify-error";
import {
  countsTowardsPlanTotal,
  type AddPlanItemRequest,
  type TreatmentPlanItem,
  type UpdatePlanItemRequest,
} from "@/lib/entity/odontogram";

/** Una línea del plan lista para pintar: sin JSON crudo y sin decisiones. */
export interface PlanItemRow {
  /** La línea TAL CUAL la devolvió el servidor. */
  item: TreatmentPlanItem;
  /** Piezas FDI ya parseadas de `item.toothNumbers`. Vacío en las generales. */
  teeth: number[];
  /** Superficies ya parseadas de `item.surfaces`. */
  surfaces: string[];
  /**
   * `false` en las líneas anuladas (canceladas o rechazadas). La fila se sigue
   * mostrando —tachada y fuera de la suma—, ni oculta ni sumada.
   */
  countsTowardsTotal: boolean;
}

export type PlanGroupKind = "tooth" | "general";

export interface PlanItemGroup {
  kind: PlanGroupKind;
  /** Filas VISIBLES del grupo: ya han pasado por los filtros de la barra. */
  rows: PlanItemRow[];
  /** Líneas visibles del grupo, **incluidas las anuladas**. */
  count: number;
  /** Cuántas de `count` NO suman al total. */
  excludedCount: number;
  /**
   * PARTICIÓN de `totals.total`, no un cálculo nuevo: el servidor manda el total
   * del plan pero no los subtotales por grupo, y la cabecera de grupo del diseño
   * los necesita. Se usa el MISMO predicado que el backend
   * ({@link countsTowardsPlanTotal}), así que **sin filtros**
   * `subtotal(tooth) + subtotal(general) === totals.total`.
   *
   * Con filtros activos ya no: es el subtotal de LO QUE SE VE. El total del pie
   * sigue siendo el del servidor (con las ocultas dentro), y por eso la vista
   * tiene que decir cuántas filas está escondiendo (`hiddenCount`).
   */
  subtotal: number;
}

export interface UseTreatmentPlanBoardResult {
  /**
   * Plan ACTIVO del paciente. `null` mientras carga, si falló o si el paciente
   * todavía no tiene ninguno — abrir la pantalla no lo crea.
   */
  planId: string | null;
  /** Grupo "por pieza" YA FILTRADO por la barra. */
  toothGroup: PlanItemGroup;
  /** Grupo "generales" YA FILTRADO por la barra. */
  generalGroup: PlanItemGroup;
  /** Filtros de la barra: estado, setters y opciones con contador. */
  filters: UseTreatmentPlanFiltersResult;
  /** Nº de líneas del plan, sin filtrar. Denominador de "N de M". */
  loadedCount: number;
  /** Totales del servidor, sin tocar. El pie de la tabla pinta `total`. */
  totals: TreatmentPlanItemsTotals;
  /** Moneda ya resuelta (la congelada del plan; si no hay, la de la clínica). */
  currency: string;
  /** Líneas que NO suman al total, en todo el plan (no solo en lo visible). */
  excludedCount: number;
  /** `true` mientras se resuelve el plan o se cargan sus líneas. */
  loading: boolean;
  /** `true` mientras hay cualquier mutación de línea en vuelo. */
  mutating: boolean;
  /** Líneas con una mutación en vuelo: solo SUS controles se bloquean. */
  pendingItemIds: ReadonlySet<string>;
  /** Mensaje real del backend de lo que falló; `null` si todo fue bien. */
  error: string | null;
  /** Reintenta lo que falló: la lectura del plan o la carga de líneas. */
  retry: () => void;
  /**
   * Añade líneas al plan del paciente, CREÁNDOLO si aún no tiene ninguno. Es la
   * primera escritura real de esta pantalla y la única vía por la que se
   * materializa el borrador.
   *
   * Nunca lanza: los fallos ya se avisan con `notifyApiError` (mensaje real del
   * backend — "plan no activo", mezcla de monedas, servicio inactivo…) y se
   * devuelve `null`.
   *
   * @returns líneas creadas+revividas según el servidor, o `null` si falló.
   */
  addItems: (newItems: AddPlanItemRequest[]) => Promise<number | null>;
  /**
   * PATCH null-aware de una línea: manda SOLO los campos que cambian.
   *
   * Las tres mutaciones de línea devuelven `false` tanto si el servidor falló
   * (ya avisado con el mensaje real: "plan no activo", el 422 del descuento sin
   * motivo…) como si el disparo se descartó por haber otro en vuelo sobre la
   * misma línea. No conviertas ese `false` en un toast propio.
   *
   * Tras el éxito se releen SIEMPRE las líneas y los totales del servidor:
   * `lineTotal`, `total` y `status` los calcula él.
   */
  updateItem: (
    itemId: string,
    changes: UpdatePlanItemRequest,
  ) => Promise<boolean>;
  /** Suma una sesión ejecutada. Exige el módulo `odontogram` en el backend. */
  registerSession: (itemId: string, visitId?: string | null) => Promise<boolean>;
  /** Saca la línea del presupuesto (borrado lógico en el servidor). */
  removeItem: (itemId: string) => Promise<boolean>;
  /**
   * Devuelve el id del plan, CREÁNDOLO si el paciente aún no tiene ninguno.
   * Reservado para la primera escritura real: la pantalla de solo lectura no
   * debe llamarlo. Rechaza con el error del backend.
   */
  ensurePlan: () => Promise<string>;
}

/**
 * `toothNumbers` y `surfaces` viajan como STRING JSON (`"[16,17]"`), no como
 * array. Se parsea tolerando basura: una línea con el campo corrupto se pinta
 * como si no tuviera piezas en vez de tumbar la tabla entera.
 */
function parseJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "[]") return [];

  try {
    const parsed: unknown = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Formatos heredados tipo "16,17" (sin corchetes) siguen siendo legibles.
    return trimmed.split(",");
  }
}

function parseTeeth(raw: string | null | undefined): number[] {
  return parseJsonArray(raw)
    .map((value) => Number(typeof value === "string" ? value.trim() : value))
    .filter((value) => Number.isFinite(value));
}

function parseSurfaces(raw: string | null | undefined): string[] {
  return parseJsonArray(raw)
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);
}

function buildGroup(kind: PlanGroupKind, rows: PlanItemRow[]): PlanItemGroup {
  let excludedCount = 0;
  let subtotal = 0;

  for (const row of rows) {
    if (row.countsTowardsTotal) subtotal += row.item.lineTotal ?? 0;
    else excludedCount += 1;
  }

  return { kind, rows, count: rows.length, excludedCount, subtotal };
}

/**
 * useTreatmentPlanBoard
 *
 * Todo lo que la pantalla del plan de tratamiento necesita para pintarse: LEE el
 * plan activo del paciente, carga sus líneas, las filtra con la barra y las
 * entrega ya agrupadas en "por pieza" y "generales", junto con las mutaciones
 * de línea (decisión, fase, descuento, sesión, quitar).
 *
 * Lo que este hook NO hace, a propósito:
 * - No crea nada al montarse. Si el paciente no tiene plan, `planId` es `null` y
 *   la vista pinta su estado vacío; el borrador se crea con `ensurePlan()` en la
 *   primera escritura real.
 * - No recalcula `total`, `acceptedTotal`, `lineTotal` ni `status`: los
 *   congela/calcula el servidor y sumarlos aquí haría que la pantalla pudiera
 *   diferir del presupuesto guardado.
 * - No convierte importes de moneda (ADR-32): pinta la moneda congelada del plan.
 * - No parchea el estado tras una mutación: relee del servidor. Aceptar una
 *   línea mueve `total`, `acceptedTotal` y `status` a la vez, y adivinar
 *   los tres en el cliente es exactamente cómo la pantalla acabaría enseñando un
 *   presupuesto que el servidor no guardó.
 *
 * @param patientId paciente del que se abre el plan.
 */
export function useTreatmentPlanBoard(
  patientId: string,
): UseTreatmentPlanBoardResult {
  const {
    planId,
    loading: planLoading,
    error: planError,
    retry: retryPlan,
    ensurePlan,
  }: UsePatientTreatmentPlanResult = usePatientTreatmentPlan(patientId);

  const {
    items,
    totals,
    currency,
    loading: itemsLoading,
    mutating,
    pendingItemIds,
    error: itemsError,
    reload,
    addItems: addItemsToPlan,
    updateItem,
    registerSession,
    removeItem,
  } = useTreatmentPlanItems(planId);

  /** TODAS las líneas del plan, parseadas y en el orden del servidor. */
  const rows = useMemo(() => {
    // `itemOrder` es el orden con el que el servidor numera las líneas; sin él
    // la tabla se reordenaría en cada recarga y el presupuesto impreso dejaría
    // de parecerse al de la pantalla.
    return [...items]
      .sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0))
      .map<PlanItemRow>((item) => ({
        item,
        // `general` lo decide el SERVIDOR. No se infiere de `toothNumbers`:
        // divergirían en cuanto el backend cambiara el criterio.
        teeth: item.general ? [] : parseTeeth(item.toothNumbers),
        surfaces: parseSurfaces(item.surfaces),
        countsTowardsTotal: countsTowardsPlanTotal(item),
      }));
  }, [items]);

  // El filtro es de VISTA y va en cliente: el plan entero ya está en memoria.
  // Se ata al paciente para que cambiar de ficha no arrastre el filtro anterior.
  const filters = useTreatmentPlanFilters(rows, patientId);

  const { toothGroup, generalGroup } = useMemo(() => {
    const tooth: PlanItemRow[] = [];
    const general: PlanItemRow[] = [];

    for (const row of filters.visibleRows) {
      if (row.item.general) general.push(row);
      else tooth.push(row);
    }

    return {
      toothGroup: buildGroup("tooth", tooth),
      generalGroup: buildGroup("general", general),
    };
  }, [filters.visibleRows]);

  // Sobre TODAS las líneas, no solo las visibles: explica por qué el recuento de
  // la cabecera (`totalCount`, que incluye anuladas) no cuadra con el importe de
  // al lado, y esa frase habla del plan entero, no de lo que el filtro deje ver.
  const excludedCount = useMemo(
    () => rows.reduce((sum, row) => sum + (row.countsTowardsTotal ? 0 : 1), 0),
    [rows],
  );

  const error = planError ?? itemsError;

  const retry = useCallback(() => {
    // Sin plan resuelto no hay líneas que recargar: lo que hay que reintentar
    // es la lectura del plan activo.
    if (planError || !planId) {
      retryPlan();
      return;
    }
    void reload();
  }, [planError, planId, reload, retryPlan]);

  const addItems = useCallback(
    async (newItems: AddPlanItemRequest[]): Promise<number | null> => {
      if (newItems.length === 0) return null;

      let targetPlanId: string;
      try {
        // El borrador se materializa AQUÍ, en la primera línea que el usuario
        // añade de verdad, no al abrir la pantalla: un plan creado por mirar
        // aparecería como "Pendiente · Sin tratamientos" en la historia clínica
        // y el contrato no tiene DELETE, solo `cancel`.
        targetPlanId = await ensurePlan();
      } catch (err) {
        notifyApiError("No se pudo abrir el plan de tratamiento", err);
        return null;
      }

      // Se le pasa el id explícito: si el plan acaba de crearse, el `planId` que
      // ve `useTreatmentPlanItems` en este render todavía es `null`.
      return addItemsToPlan(newItems, targetPlanId);
    },
    [addItemsToPlan, ensurePlan],
  );

  return {
    planId,
    toothGroup,
    generalGroup,
    filters,
    loadedCount: rows.length,
    totals,
    currency,
    excludedCount,
    loading: planLoading || itemsLoading,
    mutating,
    pendingItemIds,
    error,
    retry,
    addItems,
    updateItem,
    registerSession,
    removeItem,
    ensurePlan,
  };
}
