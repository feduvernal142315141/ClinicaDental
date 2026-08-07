"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { treatmentPlanItemService } from "@/lib/services/odontogram";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import {
  extractApiErrorMessage,
  notifyApiError,
} from "@/lib/utils/notify-error";
import type {
  AddPlanItemRequest,
  TreatmentPlanItem,
  TreatmentPlanItemsResponse,
  UpdatePlanItemRequest,
} from "@/lib/entity/odontogram";

/**
 * Totales del plan TAL CUAL los devuelve el servidor (sin las líneas).
 * Es un alias del contrato, no un tipo nuevo: el cliente NO recalcula importes
 * — si los sumara por su cuenta, el total en pantalla podría diferir del
 * presupuesto guardado y no habría forma de saber cuál es el bueno.
 */
export type TreatmentPlanItemsTotals = Omit<
  TreatmentPlanItemsResponse,
  "items"
>;

const EMPTY_TOTALS: TreatmentPlanItemsTotals = {
  planId: "",
  total: 0,
  acceptedTotal: 0,
  currencyCode: null,
  totalCount: 0,
  toothCount: 0,
  generalCount: 0,
};

const EMPTY_PENDING: ReadonlySet<string> = new Set<string>();

/**
 * Clave del guard para las mutaciones que no son de una línea concreta (añadir).
 * No es un id de línea, así que nunca entra en `pendingItemIds`.
 */
const PLAN_SCOPE_KEY = "__plan__";

export interface UseTreatmentPlanItemsResult {
  items: TreatmentPlanItem[];
  totals: TreatmentPlanItemsTotals;
  /**
   * Moneda YA RESUELTA con la que pintar todos los importes de esta pantalla:
   * la CONGELADA del plan y, solo si el plan aún no tiene líneas, la de la
   * clínica. Nunca vacía — pasarle `""` a `formatClinicCurrencyExact` resuelve
   * a USD en silencio.
   */
  currency: string;
  /**
   * `true` mientras se cargan las líneas sin tener aún datos del plan actual
   * (montaje, cambio de plan, `reload()` explícito). El refresco que sigue a
   * una mutación NO lo activa: para eso están `mutating` y `pendingItemIds`.
   */
  loading: boolean;
  /** `true` mientras hay cualquier mutación en vuelo (incluido su refresco). */
  mutating: boolean;
  /**
   * Líneas con una mutación en vuelo. La UI deshabilita SOLO sus controles
   * (con texto, no solo spinner) y deja el resto de la tabla usable.
   */
  pendingItemIds: ReadonlySet<string>;
  /** Mensaje de la última carga fallida; `null` si la última fue bien. */
  error: string | null;
  reload: () => Promise<void>;
  /**
   * @param targetPlanId plan al que colgar las líneas cuando NO es el que este
   *   hook está leyendo. Existe por el get-or-create: el plan puede acabar de
   *   crearse en el mismo gesto que añade la primera línea, y en ese instante
   *   `planId` todavía es el `null` del render en el que se pulsó el botón.
   * @returns líneas creadas+revividas, o `null` si falló (o si se llamó sin
   *   plan, sin líneas, o con otra mutación de plan ya en vuelo: son no-ops y
   *   no lanzan toast).
   */
  addItems: (
    newItems: AddPlanItemRequest[],
    targetPlanId?: string | null,
  ) => Promise<number | null>;
  /**
   * Las tres mutaciones de línea devuelven `false` tanto si el servidor falló
   * (ya avisado con toast) como si el disparo se descartó por haber otro en
   * vuelo sobre la misma línea. No conviertas ese `false` en un toast propio:
   * duplicarías el aviso real y convertirías un doble toque en un falso error.
   */
  updateItem: (
    itemId: string,
    changes: UpdatePlanItemRequest,
  ) => Promise<boolean>;
  registerSession: (itemId: string, visitId?: string | null) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
}

/**
 * useTreatmentPlanItems
 *
 * Estado de las líneas de UN plan de tratamiento contra
 * `/treatment-plans/{planId}/items`.
 *
 * Reglas que este hook hace cumplir:
 * - Tras cada mutación con éxito RECARGA. Los totales, `lineTotal` y
 *   `displayStatus` los calcula el servidor: parchear el estado local a mano
 *   los haría divergir del presupuesto guardado.
 * - Los errores de mutación se avisan con `notifyApiError` (título contextual +
 *   mensaje real del backend: "plan no activo", "mezcla de monedas", el 422 del
 *   descuento sin motivo…). Los de CARGA no hacen toast: se exponen en `error`
 *   para que la vista pinte su estado de error en vez de un toast fugaz sobre
 *   una tabla vacía.
 * - Ignora respuestas obsoletas: solo se aplica al estado la de la ÚLTIMA
 *   petición lanzada, y nada después de desmontar.
 * - NUNCA enseña un fotograma mentiroso: al montar con plan arranca en
 *   `loading`, y al cambiar de plan limpia líneas y totales en el MISMO render
 *   (ver `prevPlanId`). Si no, se vería "aún no hay líneas" sobre un
 *   presupuesto que sí existe, o los importes del paciente anterior bajo la
 *   cabecera del nuevo.
 * - Descarta el segundo disparo sobre la MISMA línea mientras hay uno en vuelo:
 *   `registerSession` no es idempotente (el backend hace `sessionsDone + 1` en
 *   cada llamada y sella la autoría), y no hay endpoint para deshacer una
 *   sesión registrada de más.
 *
 * @param planId plan a leer. Con `null`/`undefined` el hook queda vacío y
 *   ocioso (el host resuelve antes el borrador activo del paciente).
 */
export function useTreatmentPlanItems(
  planId: string | null | undefined,
): UseTreatmentPlanItemsResult {
  const [items, setItems] = useState<TreatmentPlanItem[]>([]);
  const [totals, setTotals] = useState<TreatmentPlanItemsTotals>(EMPTY_TOTALS);
  // Arranca en `true` si ya hay plan: el primer commit de un plan con líneas
  // NO puede parecer un plan vacío.
  const [loading, setLoading] = useState(() => Boolean(planId));
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [pendingItemIds, setPendingItemIds] =
    useState<ReadonlySet<string>>(EMPTY_PENDING);

  const currentPlanId = planId ?? null;
  const [prevPlanId, setPrevPlanId] = useState<string | null>(currentPlanId);

  const mountedRef = useRef(true);
  /** Secuencia de peticiones: solo la última manda sobre el estado. */
  const requestIdRef = useRef(0);
  /**
   * Plan que se está mirando AHORA. Una carga disparada por el plan anterior
   * (p. ej. el refresco de una mutación que resolvió tarde) no puede repoblar
   * la tabla del nuevo con importes de otro paciente.
   */
  const planIdRef = useRef<string | null>(currentPlanId);
  /**
   * Guard anti-doble-disparo. Es un ref y no estado porque dos toques en el
   * mismo tick verían el estado sin actualizar todavía.
   */
  const inFlightRef = useRef<Set<string>>(new Set());

  // Cambio de plan: se limpia DURANTE el render, no en un efecto. Un efecto
  // corre después del commit, así que llegaría a pintarse un fotograma con las
  // líneas y los importes del plan anterior bajo la cabecera del nuevo.
  if (prevPlanId !== currentPlanId) {
    setPrevPlanId(currentPlanId);
    setItems([]);
    setTotals(EMPTY_TOTALS);
    setError(null);
    setLoading(Boolean(currentPlanId));
    setMutating(false);
    setPendingItemIds(EMPTY_PENDING);
    planIdRef.current = currentPlanId;
    inFlightRef.current = new Set();
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const { settings } = useClinicGeneralSettings();
  // La moneda CONGELADA del plan manda sobre la actual de la clínica (ADR-32):
  // un plan presupuestado en USD se sigue leyendo en USD. Solo si el plan aún
  // no tiene líneas (el estado normal hoy) se cae a la de la clínica. Se
  // resuelve aquí para que la vista nunca vea un `null` que
  // `formatClinicCurrencyExact` traduciría a USD sin avisar.
  const currency =
    totals.currencyCode?.trim() ||
    settings?.currency ||
    DEFAULT_CLINIC_GENERAL_SETTINGS.currency;

  /**
   * @param silent refresco posterior a una mutación: no activa `loading`, para
   *   que una acción de una fila no mande toda la tabla al esqueleto.
   * @param planIdOverride plan a leer cuando NO es el que este render ve. Lo usa
   *   el refresco posterior a una escritura: `load` se captura en la clausura
   *   del render en el que se pulsó el botón, y en el get-or-create ese render
   *   todavía veía `planId = null`. Sin el override, la recarga que refleja la
   *   escritura salía por el guard de abajo y la PRIMERA línea de cada paciente
   *   no llegaba nunca a pintarse.
   */
  const load = useCallback(
    async (silent = false, planIdOverride?: string): Promise<void> => {
      if (!mountedRef.current) return;
      const target = planIdOverride ?? planId ?? null;
      // Carga de un plan que ya no se está mirando: se abandona ANTES de tocar
      // la secuencia, para no invalidar de rebote la carga del plan vigente.
      // Con override sigue aplicando: quien escribe adopta su plan como vigente
      // (`planIdRef`) antes de mandar la petición, así que este guard solo
      // descarta lo que de verdad quedó obsoleto (cambio de paciente a mitad).
      if (target !== planIdRef.current) return;

      if (!target) {
        // Una petición en vuelo con el plan anterior ya no vale: al invalidar la
        // secuencia, su respuesta no repoblará la tabla del plan que ya no toca.
        requestIdRef.current += 1;
        setItems([]);
        setTotals(EMPTY_TOTALS);
        setError(null);
        setLoading(false);
        return;
      }

      // Invalida de paso cualquier lectura en vuelo del MISMO plan: cuando el
      // plan acaba de crearse, el efecto lanza su lectura en paralelo con el
      // POST y respondería con el plan todavía sin líneas.
      const requestId = ++requestIdRef.current;
      const isCurrent = () =>
        mountedRef.current &&
        requestId === requestIdRef.current &&
        target === planIdRef.current;

      if (!silent) setLoading(true);
      setError(null);

      try {
        const data = await treatmentPlanItemService.getPlanItems(target);
        if (!isCurrent()) return;

        setItems(data.items ?? []);
        setTotals({
          planId: data.planId ?? target,
          total: data.total ?? 0,
          acceptedTotal: data.acceptedTotal ?? 0,
          currencyCode: data.currencyCode ?? null,
          totalCount: data.totalCount ?? 0,
          toothCount: data.toothCount ?? 0,
          generalCount: data.generalCount ?? 0,
        });
      } catch (err) {
        if (!isCurrent()) return;
        setError(
          extractApiErrorMessage(err) ??
            "No se pudieron cargar las líneas del plan de tratamiento.",
        );
        setItems([]);
        setTotals(EMPTY_TOTALS);
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [planId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback((): Promise<void> => load(), [load]);

  /**
   * Ejecuta una mutación, avisa del error con el mensaje real del backend y
   * refresca en caso de éxito. Devuelve `null` si falló o si se descartó por
   * haber ya una mutación en vuelo sobre la misma clave.
   *
   * @param key `itemId` de la línea que se muta, o `PLAN_SCOPE_KEY` si la
   *   mutación es del plan entero (añadir líneas).
   * @param reloadPlanId plan sobre el que se escribió, cuando no coincide con el
   *   que este render está leyendo (get-or-create). Sin él, el refresco usaría
   *   el `planId` de la clausura —`null`— y no recargaría nada.
   */
  const runMutation = useCallback(
    async <T>(
      key: string,
      action: () => Promise<T>,
      errorTitle: string,
      reloadPlanId?: string,
    ): Promise<T | null> => {
      // Doble toque en el iPad del sillón: el segundo se descarta en silencio.
      // Registrar sesión suma +1 en cada llamada y no se puede deshacer.
      if (inFlightRef.current.has(key)) return null;
      inFlightRef.current.add(key);

      const isItemScoped = key !== PLAN_SCOPE_KEY;
      if (mountedRef.current) {
        setMutating(true);
        if (isItemScoped) {
          setPendingItemIds((prev) => new Set(prev).add(key));
        }
      }

      const release = () => {
        inFlightRef.current.delete(key);
        if (!mountedRef.current) return;
        setMutating(inFlightRef.current.size > 0);
        if (isItemScoped) {
          setPendingItemIds((prev) => {
            if (!prev.has(key)) return prev;
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      };

      let result: T;
      try {
        result = await action();
      } catch (err) {
        release();
        notifyApiError(errorTitle, err);
        return null;
      }

      try {
        await load(true, reloadPlanId);
      } finally {
        release();
      }
      return result;
    },
    [load],
  );

  const addItems = useCallback(
    async (
      newItems: AddPlanItemRequest[],
      targetPlanId?: string | null,
    ): Promise<number | null> => {
      // `targetPlanId` manda sobre el del hook: cuando el paciente todavía no
      // tenía plan, quien llama acaba de crearlo y este render aún ve `null`.
      // Sin esa vía, la PRIMERA línea de cada paciente sería un no-op silencioso
      // (el `if (!target)` de `load`) y el panel se cerraría diciendo que todo
      // fue bien.
      const target = targetPlanId ?? planId;
      if (!target || newItems.length === 0) return null;

      // El plan pasa a ser el VIGENTE aquí, antes de escribir, y no cuando React
      // repinte con el `planId` nuevo: el POST sale en la misma microtarea que
      // lo creó, así que el refresco posterior llegaría con `planIdRef` todavía
      // en `null` y el guard de `load` lo descartaría. Adoptarlo ahora es seguro
      // —`ensurePlan()` acaba de resolverlo para ESTE paciente— y deja que un
      // cambio de paciente posterior siga invalidando el refresco: el bloque de
      // reset del render reescribe `planIdRef` con el plan nuevo.
      planIdRef.current = target;

      return runMutation(
        PLAN_SCOPE_KEY,
        () => treatmentPlanItemService.addPlanItems(target, { items: newItems }),
        "No se pudieron añadir las líneas al plan",
        target,
      );
    },
    [planId, runMutation],
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      changes: UpdatePlanItemRequest,
    ): Promise<boolean> => {
      const done = await runMutation(
        itemId,
        () => treatmentPlanItemService.updatePlanItem(itemId, changes),
        "No se pudo actualizar la línea",
      );
      return done === true;
    },
    [runMutation],
  );

  const registerSession = useCallback(
    async (itemId: string, visitId?: string | null): Promise<boolean> => {
      const done = await runMutation(
        itemId,
        () =>
          treatmentPlanItemService.registerPlanItemSession(
            itemId,
            visitId ? { visitId } : undefined,
          ),
        "No se pudo registrar la sesión",
      );
      return done === true;
    },
    [runMutation],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      const done = await runMutation(
        itemId,
        () => treatmentPlanItemService.removePlanItem(itemId),
        "No se pudo quitar la línea del plan",
      );
      return done === true;
    },
    [runMutation],
  );

  return {
    items,
    totals,
    currency,
    loading,
    mutating,
    pendingItemIds,
    error,
    reload,
    addItems,
    updateItem,
    registerSession,
    removeItem,
  };
}
