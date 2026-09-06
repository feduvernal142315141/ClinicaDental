"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type { PatientVisitRecord } from "@/lib/entity/clinical-history";

export type VisitRecordState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; record: PatientVisitRecord }
  | { status: "empty" }
  | { status: "failed"; message: string };
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
  records: Record<string, VisitRecordState>;
  request: (appointmentId: string) => void;
  invalidate: (appointmentId: string) => void;
  retry: (appointmentId: string) => void;
}
export function useVisitRecordsBatch(
  patientId: string,
  enabled: boolean = true,
): UseVisitRecordsBatchResult {
  const [records, setRecords] = useState<Record<string, VisitRecordState>>({});
  const recordsRef = useRef<Record<string, VisitRecordState>>({});
  const queueRef = useRef<string[]>([]);
  const inFlightRef = useRef(0);
  const generationRef = useRef(0);
  const patientRef = useRef(patientId);
  const mountedRef = useRef(true);
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
      if (current.status !== "failed") return;
      enqueue(appointmentId);
    },
    [enqueue],
  );
  return { records, request, retry, invalidate };
}
