"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type { VisitRecordState } from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import type { Appointment } from "@/lib/entity/appointment/appointments";

const MAX_CONCURRENT = 4;
const PRINT_ROOT_SELECTOR = "body > .evolution-print";
const PRINT_ACTIVE_ATTR = "data-print-active";
const GENERIC_FAILURE = "No se pudo cargar el registro de esta visita";
const FORBIDDEN_FAILURE = "No tiene permisos para ver el registro de esta visita";
function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const raw = (error as { status?: unknown }).status;
    return typeof raw === "number" ? raw : undefined;
  }
  return undefined;
}
function isResolved(state: VisitRecordState | undefined): boolean {
  return state?.status === "ready" || state?.status === "empty";
}
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
  loaded: number;
  total: number;
}
export interface UseEvolutionPrintParams {
  patientId: string;
  appointments: Appointment[];
  invalidateAppointmentId?: string;
  invalidateToken?: number;

  onAfterPrint?: () => void;
}
export interface UseEvolutionPrintResult {
  print: (scopeAppointmentIds?: string[] | null) => void;
  preparing: boolean;
  progress: EvolutionPrintProgress;
  records: Record<string, VisitRecordState>;
}
export function useEvolutionPrint({
  patientId,
  appointments,
  invalidateAppointmentId,
  invalidateToken,
  onAfterPrint,
}: UseEvolutionPrintParams): UseEvolutionPrintResult {
  const [records, setRecords] = useState<Record<string, VisitRecordState>>({});
  const [preparing, setPreparing] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [printPending, setPrintPending] = useState(false);
  const [scopeTotal, setScopeTotal] = useState<number | null>(null);
  const cacheRef = useRef<Record<string, VisitRecordState>>({});
  const generationRef = useRef(0);
  const patientRef = useRef(patientId);
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const printGuardRef = useRef(false);
  const afterPrintRef = useRef(onAfterPrint);
  afterPrintRef.current = onAfterPrint;
  const ordered = useMemo(
    () => orderEvolutionAppointments(appointments),
    [appointments],
  );
  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;
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
    setScopeTotal(null);
  }
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);
  useEffect(() => {
    const release = () => {
      window.document
        .querySelector(PRINT_ROOT_SELECTOR)
        ?.removeAttribute(PRINT_ACTIVE_ATTR);
      if (!printGuardRef.current) return;
      printGuardRef.current = false;
      afterPrintRef.current?.();
    };
    window.addEventListener("afterprint", release);
    return () => {
      window.removeEventListener("afterprint", release);
      window.document
        .querySelector(PRINT_ROOT_SELECTOR)
        ?.removeAttribute(PRINT_ACTIVE_ATTR);
    };
  }, []);

  const lastInvalidateTokenRef = useRef(invalidateToken);
  useEffect(() => {
    if (invalidateToken === lastInvalidateTokenRef.current) return;
    lastInvalidateTokenRef.current = invalidateToken;
    const appointmentId = invalidateAppointmentId;
    if (!appointmentId || !(appointmentId in cacheRef.current)) return;
    const next = { ...cacheRef.current };
    delete next[appointmentId];
    cacheRef.current = next;
    setRecords(next);
  }, [invalidateToken, invalidateAppointmentId]);
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
        if (httpStatus === 404) return { status: "empty" };
        return {
          status: "failed",
          message: httpStatus === 403 ? FORBIDDEN_FAILURE : GENERIC_FAILURE,
        };
      }
    },
    [],
  );
  const print = useCallback(
    (scopeAppointmentIds?: string[] | null) => {
      if (runningRef.current) return;
      const wanted = scopeAppointmentIds?.length
        ? new Set(scopeAppointmentIds)
        : null;
      const targets = wanted
        ? orderedRef.current.filter((appointment) => wanted.has(appointment.id))
        : orderedRef.current;
      const generation = generationRef.current;
      const pending = targets
        .map((appointment) => appointment.id)
        .filter((id) => id && !isResolved(cacheRef.current[id]));
      const settledCount = targets.length - pending.length;
      setScopeTotal(targets.length);
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
    },
    [commit, fetchOne],
  );
  useEffect(() => {
    if (!printPending) return;
    let cancelled = false;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        setPrintPending(false);
        if (typeof window === "undefined") return;
        window.document
          .querySelector(PRINT_ROOT_SELECTOR)
          ?.setAttribute(PRINT_ACTIVE_ATTR, "");
        printGuardRef.current = true;
        window.print();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [printPending]);
  const progress = useMemo<EvolutionPrintProgress>(
    () => ({ loaded, total: scopeTotal ?? ordered.length }),
    [loaded, scopeTotal, ordered.length],
  );
  return { print, preparing, progress, records };
}
export default useEvolutionPrint;
