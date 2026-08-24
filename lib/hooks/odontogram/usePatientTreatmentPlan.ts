"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { treatmentPlanService } from "@/lib/services/odontogram";
import { extractApiErrorMessage } from "@/lib/utils/notify-error";
import type { TreatmentPlanResponse } from "@/lib/entity/odontogram";

/** Nombre del borrador que se crea en la PRIMERA escritura real del plan. */
export const DEFAULT_TREATMENT_PLAN_NAME = "Plan de tratamiento";

/**
 * Página amplia a propósito: el endpoint no admite (hoy) un filtro fiable por
 * `status` con el separador canónico `__`, así que el activo se elige en
 * cliente. 50 planes por paciente es un techo holgado — el seeder de demo crea
 * 10 en TODA la base.
 */
const PLAN_PAGE_SIZE = 50;

export interface UsePatientTreatmentPlanResult {
  /** Plan ACTIVO del paciente, o `null` si todavía no tiene ninguno. */
  plan: TreatmentPlanResponse | null;
  /** Atajo de `plan?.id`. `null` mientras carga, si falló o si aún no hay plan. */
  planId: string | null;
  loading: boolean;
  /** Mensaje real del backend si la lectura falló; `null` si fue bien. */
  error: string | null;
  /** Reintenta la lectura del plan activo. */
  retry: () => void;
  /**
   * Devuelve el id del plan activo CREÁNDOLO si el paciente aún no tiene
   * ninguno. Es la única vía que escribe, y existe para llamarse desde una
   * ESCRITURA REAL del usuario (el "Añadir al plan"), nunca al abrir la
   * pantalla: abrir una vista de solo lectura no puede dejar registro.
   *
   * Rechaza con el error del backend (el llamante avisa con `notifyApiError`);
   * no toca `error`, que es el estado de la LECTURA de la pantalla.
   */
  ensurePlan: () => Promise<string>;
}

/**
 * Creaciones EN VUELO por paciente.
 *
 * El único propósito es que dos disparos casi simultáneos de `ensurePlan`
 * dentro del MISMO contexto JS (doble toque en el iPad del sillón, dos paneles
 * montados a la vez) no acaben en dos `POST /treatment-plans`. Se BORRA al
 * liquidar la promesa: no memoriza resultados, solo evita la carrera.
 *
 * NO cubre la carrera entre pestañas del navegador ni entre equipos: es un Map
 * de módulo. Para eso hace falta idempotencia en el servidor (índice único de
 * plan activo por paciente, o un `/treatment-plans/patient/{id}/active` con
 * get-or-create atómico). Mientras no exista, {@link createActivePlan} vuelve a
 * mirar justo antes de crear para estrechar la ventana todo lo posible.
 */
const inFlightByPatient = new Map<string, Promise<TreatmentPlanResponse>>();

/** ¿Es este el plan "vivo" al que se le pueden colgar líneas? */
function isActivePlan(plan: TreatmentPlanResponse): boolean {
  return plan.status === "active" && plan.active !== false;
}

/** Más reciente primero; los que no traen fecha quedan al final. */
function byCreatedAtDesc(
  a: TreatmentPlanResponse,
  b: TreatmentPlanResponse,
): number {
  const left = Date.parse(a.createdAt ?? "");
  const right = Date.parse(b.createdAt ?? "");
  if (Number.isNaN(left) && Number.isNaN(right)) return 0;
  if (Number.isNaN(left)) return 1;
  if (Number.isNaN(right)) return -1;
  return right - left;
}

/** SOLO LECTURA: el plan activo del paciente, o `null` si no tiene ninguno. */
async function findActivePlan(
  patientId: string,
): Promise<TreatmentPlanResponse | null> {
  const page = await treatmentPlanService.getTreatmentPlansByPatient(
    patientId,
    { page: 0, pageSize: PLAN_PAGE_SIZE },
  );

  const existing = (page.entities ?? [])
    .filter(isActivePlan)
    .sort(byCreatedAtDesc)[0];

  return existing ?? null;
}

/** ESCRITURA: reutiliza el borrador activo y, solo si no hay, lo crea. */
async function createActivePlan(
  patientId: string,
): Promise<TreatmentPlanResponse> {
  // Se vuelve a preguntar justo antes de crear: entre abrir la pantalla y
  // pulsar "Añadir al plan" puede haber aparecido un plan (otra pestaña, el
  // ordenador de recepción). Crear uno por sesión partiría el presupuesto del
  // paciente en varios documentos y ninguno sería "el" plan.
  const existing = await findActivePlan(patientId);
  if (existing) return existing;

  const createdId = await treatmentPlanService.createTreatmentPlan({
    patientId,
    name: DEFAULT_TREATMENT_PLAN_NAME,
  });

  const created = await treatmentPlanService.getTreatmentPlan(createdId);
  if (created) return created;

  // El POST confirmó el id pero el GET no lo devolvió (carrera de réplica o
  // permiso). Se sigue adelante con el id: es lo único que hace falta para
  // leer y colgar líneas, y el nombre lo sabemos porque lo acabamos de mandar.
  return {
    id: createdId,
    patientId,
    name: DEFAULT_TREATMENT_PLAN_NAME,
    status: "active",
    eventIds: "[]",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    active: true,
  };
}

/**
 * usePatientTreatmentPlan
 *
 * Plan de tratamiento ACTIVO del paciente. Abrir la pantalla solo LEE: si el
 * paciente no tiene plan, `plan` queda en `null` y la vista pinta su estado
 * vacío, que es exactamente el estado real.
 *
 * La creación del borrador es una ACCIÓN aparte ({@link
 * UsePatientTreatmentPlanResult.ensurePlan}) que debe dispararse en la primera
 * escritura de verdad. Estaba en el efecto de montaje y MIRAR una pantalla de
 * solo lectura escribía en la base: ese plan fantasma no se quedaba invisible
 * —la tarjeta "Planes de tratamiento" de la pestaña Historia Clínica lista todo
 * plan que no esté `completed`/`cancelled`, así que aparecía ahí como
 * "Pendiente · Sin tratamientos"— y el contrato no tiene DELETE, solo `cancel`.
 *
 * Permisos: tanto `GET /treatment-plans/patient/{id}` como
 * `POST /treatment-plans` exigen la autoridad `odontogram`. Un rol sin ella
 * recibe 403 aquí mismo, así que la pantalla que use este hook debe ocultarse
 * entera en ese caso en vez de enseñar un error.
 */
export function usePatientTreatmentPlan(
  patientId: string | null | undefined,
): UsePatientTreatmentPlanResult {
  const [plan, setPlan] = useState<TreatmentPlanResponse | null>(null);
  // Arranca en `true` cuando hay paciente: el primer commit NO puede parecer
  // "resuelto y sin plan", que es justo lo que dispara el estado vacío.
  const [loading, setLoading] = useState(() => Boolean(patientId));
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const currentPatientId = patientId ?? null;
  const [prevPatientId, setPrevPatientId] = useState<string | null>(
    currentPatientId,
  );

  // Cambio de paciente: se limpia DURANTE el render. En un efecto (que corre
  // tras el commit) llegaría a pintarse un fotograma con el plan del paciente
  // anterior bajo la cabecera del nuevo.
  if (prevPatientId !== currentPatientId) {
    setPrevPatientId(currentPatientId);
    setPlan(null);
    setError(null);
    setLoading(Boolean(currentPatientId));
  }

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Secuencia de resoluciones: solo la ÚLTIMA lanzada manda sobre el estado.
   * Cubre a la vez el cambio de paciente, el `retry()` y el `ensurePlan()` que
   * adelanta a una lectura todavía en vuelo.
   */
  const requestIdRef = useRef(0);

  /**
   * Espejo del plan ya resuelto. `ensurePlan` corre desde un manejador de
   * eventos y necesita el valor vigente sin recrearse en cada render.
   */
  const planRef = useRef<TreatmentPlanResponse | null>(null);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    if (!patientId) {
      // Invalida cualquier lectura en vuelo del paciente anterior.
      requestIdRef.current += 1;
      setPlan(null);
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const isCurrent = () =>
      mountedRef.current && requestId === requestIdRef.current;

    setLoading(true);
    setError(null);

    findActivePlan(patientId)
      .then((resolved) => {
        if (!isCurrent()) return;
        setPlan(resolved);
      })
      .catch((err: unknown) => {
        if (!isCurrent()) return;
        // Sin toast: es un error de CARGA. La pantalla pinta su propio estado de
        // error con reintento, que no se desvanece a los cinco segundos.
        setError(
          extractApiErrorMessage(err) ??
            "No se pudo abrir el plan de tratamiento del paciente.",
        );
        setPlan(null);
      })
      .finally(() => {
        if (!isCurrent()) return;
        setLoading(false);
      });
  }, [patientId, retryToken]);

  const ensurePlan = useCallback(async (): Promise<string> => {
    if (!patientId) {
      throw new Error("No hay paciente al que asociar el plan de tratamiento.");
    }

    const known = planRef.current;
    if (known && known.patientId === patientId) return known.id;

    const pending =
      inFlightByPatient.get(patientId) ??
      (() => {
        const promise = createActivePlan(patientId).finally(() => {
          inFlightByPatient.delete(patientId);
        });
        inFlightByPatient.set(patientId, promise);
        return promise;
      })();

    // Se reserva el turno ANTES de esperar: si había una lectura en vuelo, su
    // resultado ya no puede pisar al plan que acabamos de resolver.
    const requestId = ++requestIdRef.current;
    const resolved = await pending;

    if (mountedRef.current && requestId === requestIdRef.current) {
      planRef.current = resolved;
      setPlan(resolved);
      setError(null);
      setLoading(false);
    }

    return resolved.id;
  }, [patientId]);

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  return {
    plan,
    planId: plan?.id ?? null,
    loading,
    error,
    retry,
    ensurePlan,
  };
}
