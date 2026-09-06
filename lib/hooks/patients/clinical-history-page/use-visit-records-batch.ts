"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type { PatientVisitRecord } from "@/lib/entity/clinical-history";

/**
 * Estado de carga del registro clínico de UNA visita.
 *
 * ── POR QUÉ CUATRO ESTADOS Y NO UN `record | null` ──────────────────────────
 * En un documento médico-legal no es lo mismo "esta visita nunca se inició"
 * (404: no existe fila de registro) que "no pudimos leerla" (5xx / red). Colapsar
 * ambos en `null` haría DESAPARECER de la ficha una nota de evolución que sí
 * existe, presentándola como ausencia de dato clínico. Por eso `empty` y
 * `failed` son estados distintos y la UI los rotula distinto:
 *   - `empty`  → "Sin registro de visita"
 *   - `failed` → "No se pudo cargar el registro de esta visita" + Reintentar
 * El tercer caso —registro presente con `clinicalNotes` vacío— NO es un estado
 * de este hook: llega como `ready` y lo distingue la UI leyendo el registro.
 */
export type VisitRecordState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; record: PatientVisitRecord }
  | { status: "empty" }
  | { status: "failed"; message: string };

/** Peticiones simultáneas máximas. No hay endpoint de listado: 1 visita = 1 GET. */
const MAX_CONCURRENT = 4;

const IDLE: VisitRecordState = { status: "idle" };

const GENERIC_FAILURE = "No se pudo cargar el registro de esta visita";
const FORBIDDEN_FAILURE = "No tiene permisos para ver el registro de esta visita";

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const raw = (error as { status?: unknown }).status;
    return typeof raw === "number" ? raw : undefined;
  }
  return undefined;
}

function failureMessage(httpStatus: number | undefined): string {
  return httpStatus === 403 ? FORBIDDEN_FAILURE : GENERIC_FAILURE;
}

export interface UseVisitRecordsBatchResult {
  /**
   * Estado por `appointmentId`. Una clave AUSENTE equivale a `{ status: "idle" }`
   * (aún no se pidió): leer siempre `records[id] ?? { status: "idle" }`.
   */
  records: Record<string, VisitRecordState>;
  /** Encola la carga de una visita. Idempotente: sobre algo no-idle no hace nada. */
  request: (appointmentId: string) => void;
  /**
   * Descarta la copia cacheada de una visita y la vuelve a pedir. Necesario
   * porque el editor de la consulta en curso escribe por otra vía (`PATCH
   * .../notes` desde `useVisitRecord`): sin esto la tarjeta de esa misma
   * consulta en el feed seguía mostrando el texto ANTERIOR, con su sello de
   * "Última edición", justo debajo del editor que ya mostraba el nuevo. Dos
   * versiones contradictorias de la misma nota clínica en la misma pantalla.
   */
  invalidate: (appointmentId: string) => void;
  /** Reintenta SOLO una visita en `failed`. Un `empty` (404) no se reintenta jamás. */
  retry: (appointmentId: string) => void;
}

/**
 * Carga bajo demanda los registros de visita del feed de evolución.
 *
 * Estrategia: cola con pool de concurrencia (máx. 4) + caché por cita. Una visita
 * ya resuelta NUNCA se vuelve a pedir sola; un 404 se cachea como `empty` de forma
 * definitiva (es la respuesta correcta, no un fallo) y un 5xx/red queda en `failed`
 * a la espera de un `retry` explícito del usuario.
 *
 * No emite toasts a propósito: un feed de 30 visitas contra un backend caído
 * produciría 30 avisos. El fallo se pinta en la tarjeta de cada visita.
 */
export function useVisitRecordsBatch(
  patientId: string,
  /**
   * Sin autoridad de `clinical_history` no se pide NADA. El endpoint está bajo
   * CLINICAL_HISTORY_AUTHORITY y el interceptor global abre un diálogo modal de
   * "Acceso Denegado" en cada 403: con la carga anticipada eran ocho seguidos
   * nada más abrir la ficha.
   */
  enabled: boolean = true,
): UseVisitRecordsBatchResult {
  const [records, setRecords] = useState<Record<string, VisitRecordState>>({});

  /** Espejo síncrono de `records`: la cola decide sin esperar al re-render. */
  const recordsRef = useRef<Record<string, VisitRecordState>>({});
  const queueRef = useRef<string[]>([]);
  const inFlightRef = useRef(0);
  /** Cambia con el paciente: invalida respuestas en vuelo del paciente anterior. */
  const generationRef = useRef(0);
  const patientRef = useRef(patientId);
  const mountedRef = useRef(true);

  // Reset al cambiar de paciente. Se hace en RENDER (patrón de estado derivado de
  // props) y no en un efecto: los efectos de los hijos corren ANTES que los del
  // padre, así que un reset en efecto borraría las peticiones que los hijos ya
  // encolaron para el paciente nuevo.
  const [trackedPatientId, setTrackedPatientId] = useState(patientId);
  if (trackedPatientId !== patientId) {
    setTrackedPatientId(patientId);
    generationRef.current += 1;
    patientRef.current = patientId;
    queueRef.current = [];
    inFlightRef.current = 0;
    recordsRef.current = {};
    setRecords({});
  }

  useEffect(() => {
    mountedRef.current = true;

    // RESCATE DE PETICIONES HUÉRFANAS.
    // El cleanup de abajo incrementa la generación, así que las respuestas en
    // vuelo del ciclo anterior se descartan al escribir. Eso es correcto —no se
    // toca el estado de un componente desmontado—, pero deja las entradas que ya
    // estaban marcadas `loading` sin nadie que las resuelva: `request()` es
    // idempotente y sale por la puerta ante cualquier estado que no sea `idle`,
    // así que jamás se vuelven a pedir.
    //
    // Pasa SIEMPRE en desarrollo con StrictMode (monta → desmonta → monta), y en
    // producción en cualquier remonte. El síntoma es una tarjeta de consulta con
    // el esqueleto puesto para siempre: ni nota, ni "sin registro", ni error.
    // Devolverlas a `idle` permite que el consumidor las vuelva a encolar.
    let rescued = false;
    const next = { ...recordsRef.current };
    for (const [id, state] of Object.entries(next)) {
      if (state.status === "loading") {
        next[id] = IDLE;
        rescued = true;
      }
    }
    if (rescued) {
      recordsRef.current = next;
      setRecords(next);
    }

    return () => {
      // Cancelación: las respuestas en vuelo seguirán llegando, pero ni ellas ni
      // la cola pueden tocar el estado de un componente desmontado.
      mountedRef.current = false;
      generationRef.current += 1;
      queueRef.current = [];
    };
  }, []);

  const write = useCallback(
    (appointmentId: string, next: VisitRecordState, generation: number) => {
      if (!mountedRef.current || generation !== generationRef.current) return;
      recordsRef.current = { ...recordsRef.current, [appointmentId]: next };
      setRecords(recordsRef.current);
    },
    [],
  );

  const pumpRef = useRef<() => void>(() => {});

  const run = useCallback(
    async (appointmentId: string) => {
      const generation = generationRef.current;
      const currentPatientId = patientRef.current;
      inFlightRef.current += 1;

      try {
        const record = await clinicalHistoryService.getVisitRecord(
          currentPatientId,
          appointmentId,
        );
        write(appointmentId, { status: "ready", record }, generation);
      } catch (error) {
        const httpStatus = statusOf(error);
        write(
          appointmentId,
          httpStatus === 404
            ? { status: "empty" }
            : { status: "failed", message: failureMessage(httpStatus) },
          generation,
        );
      } finally {
        // Si la generación cambió, el contador ya se puso a 0 en el reset: no
        // decrementar o quedaría negativo y abriría slots de más.
        if (generation === generationRef.current) {
          inFlightRef.current -= 1;
          pumpRef.current();
        }
      }
    },
    [write],
  );

  const pump = useCallback(() => {
    while (inFlightRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      if (!next) break;
      void run(next);
    }
  }, [run]);

  pumpRef.current = pump;

  const enqueue = useCallback(
    (appointmentId: string) => {
      if (!appointmentId || !patientRef.current) return;
      // Marcar "loading" en el encolado (no al arrancar la petición) es lo que
      // hace idempotente a `request`: la caché ya no está en idle.
      recordsRef.current = {
        ...recordsRef.current,
        [appointmentId]: { status: "loading" },
      };
      setRecords(recordsRef.current);
      queueRef.current.push(appointmentId);
      pump();
    },
    [pump],
  );

  const invalidate = useCallback(
    (appointmentId: string) => {
      if (!appointmentId) return;
      recordsRef.current = { ...recordsRef.current, [appointmentId]: IDLE };
      setRecords(recordsRef.current);
      if (enabled) enqueue(appointmentId);
    },
    [enqueue, enabled],
  );

  const request = useCallback(
    (appointmentId: string) => {
      if (!enabled) return;
      const current = recordsRef.current[appointmentId] ?? IDLE;
      if (current.status !== "idle") return;
      enqueue(appointmentId);
    },
    [enqueue, enabled],
  );

  const retry = useCallback(
    (appointmentId: string) => {
      const current = recordsRef.current[appointmentId] ?? IDLE;
      // Sólo un fallo técnico se reintenta. `empty` es un 404 legítimo y `ready`
      // ya está resuelto: reintentarlos gastaría peticiones sin cambiar nada.
      if (current.status !== "failed") return;
      enqueue(appointmentId);
    },
    [enqueue],
  );

  return { records, request, retry, invalidate };
}
