"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { odontogramService } from "@/lib/services/odontogram";
import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";

/**
 * Proyección mínima de un `ClinicalEvent` del odontograma para la ficha del
 * paciente. Cada campo existe de verdad en
 * `lib/odontogram/domain/odontogram/types/clinical-event.types.ts`; aquí no se
 * inventa ninguno.
 */
export interface ClinicalEventLike {
  id: string;
  /** Visita en la que se REGISTRÓ el evento (el store lo ata a la visita activa). */
  visitId?: string;
  /** Cita FUTURA agendada para un plan. No es la visita en que se registró. */
  appointmentId?: string;
  type?: ClinicalEvent["type"];
  status?: ClinicalEvent["status"];
  /** Numeración FDI/ISO 3950 (cuadrante + pieza, p. ej. 36). */
  toothNumber?: number;
  /** Alias de `toothNumber` con el nombre que usa la UI. Mismo valor, no otro dato. */
  toothFdi?: number;
  /** Códigos de celda del vocabulario `ToothSurface` (p. ej. "oclusal"). */
  surfaces?: string[];
  serviceName?: string;
  procedureName?: string;
  /**
   * GUARD CLÍNICO — NO FILTRAR AQUÍ.
   * `preexisting === true` es trabajo hecho en OTRA clínica que sólo se DOCUMENTÓ
   * en esa visita: no lleva autor ni fecha real de ejecución, y su `visitId` es el
   * de la visita en que se registró, no aquella en que se hizo. Contarlo como acto
   * realizado en la visita sería falso. El índice lo expone marcado para que la UI
   * lo separe; separarlo es decisión de presentación, no de este hook.
   */
  preexisting?: boolean;
  /** Fecha de REGISTRO del evento (ISO). En preexistentes no es la de ejecución. */
  createdAt?: string;
}

export interface PatientClinicalEventsIndex {
  /** visitId → eventos registrados en esa visita (preexistentes incluidos y marcados). */
  byVisit: Map<string, ClinicalEventLike[]>;
  /**
   * TODOS los eventos, incluidos los que no tienen `visitId` porque se
   * registraron fuera de una consulta. Es la fuente correcta para "qué queda
   * pendiente"; `byVisit` lo es para atribuir actos a una visita del feed.
   */
  allEvents: ClinicalEventLike[];
  /** Vuelve a leer el odontograma. Llamar tras finalizar una consulta. */
  reload: () => void;
  loading: boolean;
  /** 403: el rol no tiene el módulo odontograma. Es "sin acceso", no un error. */
  forbidden: boolean;
  error: string | null;
}

const EMPTY_INDEX: Map<string, ClinicalEventLike[]> = new Map();

const LOAD_ERROR = "No se pudieron cargar los procedimientos del odontograma";
const PARSE_ERROR = "El odontograma del paciente no se pudo leer";

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const raw = (error as { status?: unknown }).status;
    return typeof raw === "number" ? raw : undefined;
  }
  return undefined;
}

/** Convierte un evento crudo del JSON persistido en la proyección mínima. */
function toEventLike(raw: unknown): ClinicalEventLike | null {
  if (typeof raw !== "object" || raw === null) return null;
  const event = raw as Partial<ClinicalEvent>;
  if (typeof event.id !== "string" || !event.id) return null;

  const toothNumber =
    typeof event.toothNumber === "number" ? event.toothNumber : undefined;

  return {
    id: event.id,
    visitId: typeof event.visitId === "string" ? event.visitId : undefined,
    appointmentId:
      typeof event.appointmentId === "string" ? event.appointmentId : undefined,
    type: typeof event.type === "string" ? event.type : undefined,
    status: typeof event.status === "string" ? event.status : undefined,
    toothNumber,
    toothFdi: toothNumber,
    surfaces: Array.isArray(event.surfaces)
      ? (event.surfaces as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : undefined,
    serviceName:
      typeof event.serviceName === "string" ? event.serviceName : undefined,
    procedureName:
      typeof event.procedureName === "string" ? event.procedureName : undefined,
    preexisting: event.preexisting === true,
    createdAt: typeof event.createdAt === "string" ? event.createdAt : undefined,
  };
}

/**
 * Parsea el `state` (string JSON) del odontograma y agrupa sus eventos por visita.
 * Un JSON corrupto no puede tumbar la ficha: se señala como error y se devuelve
 * un índice vacío, nunca una excepción.
 */
function buildIndex(
  state: string,
): {
  byVisit: Map<string, ClinicalEventLike[]>;
  allEvents: ClinicalEventLike[];
  error: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(state);
  } catch {
    return { byVisit: new Map(), allEvents: [], error: PARSE_ERROR };
  }

  const rawEvents = (parsed as { clinicalEvents?: unknown } | null)
    ?.clinicalEvents;
  if (!Array.isArray(rawEvents)) {
    // Un odontograma sin eventos es legítimo (paciente sin procedimientos aún).
    return { byVisit: new Map(), allEvents: [], error: null };
  }

  const byVisit = new Map<string, ClinicalEventLike[]>();
  const allEvents: ClinicalEventLike[] = [];
  for (const raw of rawEvents) {
    const event = toEventLike(raw);
    if (!event) continue;
    allEvents.push(event);
    // `byVisit` solo agrupa lo atribuible a una visita: sin `visitId` no se puede
    // colgar de ninguna sin mentir. Pero el evento SÍ existe, y por eso viaja
    // también en `allEvents`: el odontograma se puede editar FUERA de una
    // consulta —volcar la ficha en papel de un paciente antiguo, un flujo
    // soportado a propósito— y esos eventos nacen sin `visitId`. Derivar los
    // pendientes solo de `byVisit` los hacía desaparecer del recuento, de modo
    // que un plan lleno de actos se anunciaba como "sin pendientes".
    if (!event.visitId) continue;
    const bucket = byVisit.get(event.visitId);
    if (bucket) bucket.push(event);
    else byVisit.set(event.visitId, [event]);
  }
  return { byVisit, allEvents, error: null };
}

/**
 * Lee UNA sola vez el odontograma vivo del paciente y construye un índice de
 * eventos clínicos por visita, para alimentar la banda de procedimientos, la
 * franja de continuidad y el filtro por pieza sin peticiones adicionales.
 *
 * `enabled === false` no dispara ninguna petición (se usa cuando el rol no tiene
 * el módulo odontograma). Un 403 se refleja en `forbidden` y no emite toast.
 */
export function usePatientClinicalEvents(
  patientId: string,
  enabled: boolean,
): PatientClinicalEventsIndex {
  // Contador de generación: forzar su cambio re-dispara el efecto. El índice era
  // una FOTO del arranque, así que tras finalizar una consulta la franja seguía
  // anunciando como pendientes actos que se acababan de ejecutar.
  const [generation, setGeneration] = useState(0);
  const reload = useCallback(() => setGeneration((g) => g + 1), []);
  const [allEvents, setAllEvents] = useState<ClinicalEventLike[]>([]);
  const [byVisit, setByVisit] =
    useState<Map<string, ClinicalEventLike[]>>(EMPTY_INDEX);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !patientId) {
      setByVisit(EMPTY_INDEX);
      setAllEvents([]);
      setLoading(false);
      setForbidden(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setForbidden(false);
    setError(null);

    odontogramService
      .getOdontogram(patientId)
      .then((response) => {
        if (cancelled || !mountedRef.current) return;
        if (!response?.state) {
          // Paciente sin odontograma todavía: ausencia real de datos, no un fallo.
          setByVisit(EMPTY_INDEX);
        setAllEvents([]);
          setAllEvents([]);
      setAllEvents([]);
          return;
        }
        const result = buildIndex(response.state);
        setByVisit(result.byVisit);
        setAllEvents(result.allEvents);
        setError(result.error);
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        const httpStatus = statusOf(err);
        setByVisit(EMPTY_INDEX);
        setAllEvents([]);
      setAllEvents([]);
        if (httpStatus === 403) {
          setForbidden(true);
          return;
        }
        if (httpStatus === 404) {
          // Sin odontograma registrado: no hay nada que mostrar y no hay fallo.
          return;
        }
        setError(LOAD_ERROR);
      })
      .finally(() => {
        if (cancelled || !mountedRef.current) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, enabled, generation]);

  return useMemo(
    () => ({ byVisit, allEvents, loading, forbidden, error, reload }),
    [byVisit, allEvents, loading, forbidden, error, reload],
  );
}
