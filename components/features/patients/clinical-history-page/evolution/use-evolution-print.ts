"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type { VisitRecordState } from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import type { Appointment } from "@/lib/entity/appointment/appointments";

/**
 * Preparación e impresión de la evolución clínica completa de un paciente.
 *
 * ── POR QUÉ ESTE HOOK NO REUTILIZA `useVisitRecordsBatch` ───────────────────
 * Ese hook vive DENTRO de `EvolutionColumn` y carga de forma perezosa: al pulsar
 * "Imprimir" la mayoría de los registros ni siquiera se han pedido, porque el
 * usuario nunca llegó a hacer scroll hasta ellos. Un documento clínico-legal no
 * puede salir de la impresora con los asientos que el usuario alcanzó a ver: o
 * están TODOS resueltos, o el documento miente por omisión.
 *
 * Por eso este hook mantiene su propia caché completa y su propio pool, y sólo
 * llama a `window.print()` cuando cada cita del documento está en un estado
 * TERMINAL (`ready`, `empty` o `failed`). Los `empty` y los `failed` también se
 * imprimen, con su texto: "sin registro" y "no se pudo cargar" son hechos del
 * expediente, no huecos que se puedan dejar en blanco.
 *
 * La carga respeta el mismo pool de concurrencia 4 que el feed: no hay endpoint
 * de listado (1 visita = 1 GET) y disparar 100 peticiones a la vez tumbaría al
 * backend justo cuando el paciente está esperando su copia en mostrador.
 */

/** Peticiones simultáneas máximas. Mismo techo que el feed en pantalla. */
const MAX_CONCURRENT = 4;

const GENERIC_FAILURE = "No se pudo cargar el registro de esta visita";
const FORBIDDEN_FAILURE = "No tiene permisos para ver el registro de esta visita";

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const raw = (error as { status?: unknown }).status;
    return typeof raw === "number" ? raw : undefined;
  }
  return undefined;
}

function isSettled(state: VisitRecordState | undefined): boolean {
  return (
    state?.status === "ready" ||
    state?.status === "empty" ||
    state?.status === "failed"
  );
}

/**
 * Orden canónico de la evolución. Es EL MISMO criterio que aplica
 * `EvolutionColumn` en pantalla —consulta en curso primero, luego por fecha y
 * hora descendente, sin canceladas— para que el papel y la pantalla no puedan
 * divergir. Se exporta para que el documento no vuelva a inventarlo.
 *
 * Nota: ordena por fecha+hora AGENDADA porque el DTO del listado no trae la
 * hora real de atención; el documento lo rotula así en cada asiento.
 */
export function orderEvolutionAppointments(
  appointments: Appointment[],
): Appointment[] {
  const visible = appointments.filter(
    (appointment) => appointment.status !== "cancelled",
  );
  return [...visible].sort((a, b) => {
    const aRunning = a.status === "in_progress" ? 1 : 0;
    const bRunning = b.status === "in_progress" ? 1 : 0;
    if (aRunning !== bRunning) return bRunning - aRunning;
    const aKey = `${a.date ?? ""}T${a.time ?? ""}`;
    const bKey = `${b.date ?? ""}T${b.time ?? ""}`;
    return bKey.localeCompare(aKey);
  });
}

export interface EvolutionPrintProgress {
  /** Citas del documento ya resueltas (incluye las vacías y las fallidas). */
  loaded: number;
  /** Citas que componen el documento. */
  total: number;
}

export interface UseEvolutionPrintParams {
  patientId: string;
  /**
   * Listado COMPLETO de citas del paciente, tal como llega del backend. El
   * documento ignora deliberadamente cualquier filtro que el usuario tenga
   * aplicado en pantalla, así que aquí no se pasa nada ya filtrado.
   */
  appointments: Appointment[];
}

export interface UseEvolutionPrintResult {
  /** Prepara el documento (carga lo que falte) y abre el diálogo de impresión. */
  print: () => void;
  /** `true` mientras se completan los registros que faltaban. */
  preparing: boolean;
  /** Avance de esa preparación, para rotular el botón que la disparó. */
  progress: EvolutionPrintProgress;
  /**
   * Estado por `appointmentId`, para que `EvolutionPrintDocument` pinte cada
   * asiento. Una clave ausente equivale a `{ status: "idle" }`.
   */
  records: Record<string, VisitRecordState>;
}

export function useEvolutionPrint({
  patientId,
  appointments,
}: UseEvolutionPrintParams): UseEvolutionPrintResult {
  const [records, setRecords] = useState<Record<string, VisitRecordState>>({});
  const [preparing, setPreparing] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [printPending, setPrintPending] = useState(false);

  /** Espejo síncrono: el pool decide sin esperar al re-render. */
  const cacheRef = useRef<Record<string, VisitRecordState>>({});
  /** Cambia con el paciente y al desmontar: invalida respuestas en vuelo. */
  const generationRef = useRef(0);
  const patientRef = useRef(patientId);
  const mountedRef = useRef(true);
  const runningRef = useRef(false);

  const ordered = useMemo(
    () => orderEvolutionAppointments(appointments),
    [appointments],
  );
  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;

  // Reset al cambiar de paciente, en RENDER y no en un efecto: un documento a
  // medio preparar del paciente anterior jamás debe acabar en la impresora con
  // la cabecera del nuevo.
  const [trackedPatientId, setTrackedPatientId] = useState(patientId);
  if (trackedPatientId !== patientId) {
    setTrackedPatientId(patientId);
    generationRef.current += 1;
    patientRef.current = patientId;
    cacheRef.current = {};
    runningRef.current = false;
    setRecords({});
    setPreparing(false);
    setPrintPending(false);
    setLoaded(0);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  const commit = useCallback(
    (appointmentId: string, next: VisitRecordState, generation: number) => {
      if (!mountedRef.current || generation !== generationRef.current) return;
      cacheRef.current = { ...cacheRef.current, [appointmentId]: next };
      setRecords(cacheRef.current);
    },
    [],
  );

  const fetchOne = useCallback(
    async (appointmentId: string): Promise<VisitRecordState> => {
      try {
        const record = await clinicalHistoryService.getVisitRecord(
          patientRef.current,
          appointmentId,
        );
        return { status: "ready", record };
      } catch (error) {
        const httpStatus = statusOf(error);
        // Un 404 NO es un fallo: es "esta visita no tiene registro creado", y
        // así se imprime. Cualquier otra cosa es un fallo técnico y se imprime
        // como tal, nunca como ausencia de dato clínico.
        if (httpStatus === 404) return { status: "empty" };
        return {
          status: "failed",
          message: httpStatus === 403 ? FORBIDDEN_FAILURE : GENERIC_FAILURE,
        };
      }
    },
    [],
  );

  const print = useCallback(() => {
    if (runningRef.current) return;

    const targets = orderedRef.current;
    const generation = generationRef.current;

    // Sólo se piden las que aún no están resueltas: reimprimir no vuelve a
    // castigar al backend con las 100 peticiones.
    const pending = targets
      .map((appointment) => appointment.id)
      .filter((id) => id && !isSettled(cacheRef.current[id]));

    const settledCount = targets.length - pending.length;
    setLoaded(settledCount);

    if (pending.length === 0) {
      setPrintPending(true);
      return;
    }

    runningRef.current = true;
    setPreparing(true);

    let cursor = 0;
    let done = settledCount;

    const worker = async () => {
      // `cursor++` es seguro: JS es de un solo hilo, no hay carrera aquí.
      while (cursor < pending.length) {
        const appointmentId = pending[cursor++];
        if (generation !== generationRef.current) return;
        const next = await fetchOne(appointmentId);
        if (generation !== generationRef.current) return;
        commit(appointmentId, next, generation);
        done += 1;
        if (mountedRef.current) setLoaded(done);
      }
    };

    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT, pending.length) },
      () => worker(),
    );

    void Promise.all(workers).then(() => {
      if (generation !== generationRef.current) return;
      runningRef.current = false;
      if (!mountedRef.current) return;
      setPreparing(false);
      setPrintPending(true);
    });
  }, [commit, fetchOne]);

  // El diálogo se abre DESPUÉS de que React haya pintado los asientos recién
  // resueltos: `window.print()` fotografía el DOM tal como está en ese instante,
  // así que llamarlo en el mismo tick imprimiría el documento incompleto.
  useEffect(() => {
    if (!printPending) return;
    let cancelled = false;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        setPrintPending(false);
        if (typeof window !== "undefined") window.print();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [printPending]);

  const progress = useMemo<EvolutionPrintProgress>(
    () => ({ loaded, total: ordered.length }),
    [loaded, ordered.length],
  );

  return { print, preparing, progress, records };
}

export default useEvolutionPrint;
