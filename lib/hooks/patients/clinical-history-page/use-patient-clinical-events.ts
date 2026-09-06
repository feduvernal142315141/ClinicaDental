"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { odontogramService } from "@/lib/services/odontogram";
import type { ClinicalEvent } from "@/lib/odontogram/domain/odontogram/types/clinical-event.types";

export interface ClinicalEventLike {
  id: string;
  visitId?: string;
  appointmentId?: string;
  type?: ClinicalEvent["type"];
  status?: ClinicalEvent["status"];
  toothNumber?: number;
  toothFdi?: number;
  surfaces?: string[];
  serviceName?: string;
  procedureName?: string;
  preexisting?: boolean;
  createdAt?: string;
}
export interface PatientClinicalEventsIndex {
  byVisit: Map<string, ClinicalEventLike[]>;
  allEvents: ClinicalEventLike[];
  reload: () => void;
  loading: boolean;
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
    return { byVisit: new Map(), allEvents: [], error: null };
  }
  const byVisit = new Map<string, ClinicalEventLike[]>();
  const allEvents: ClinicalEventLike[] = [];
  for (const raw of rawEvents) {
    const event = toEventLike(raw);
    if (!event) continue;
    allEvents.push(event);

    if (!event.visitId) continue;
    const bucket = byVisit.get(event.visitId);
    if (bucket) bucket.push(event);
    else byVisit.set(event.visitId, [event]);
  }
  return { byVisit, allEvents, error: null };
}
export function usePatientClinicalEvents(
  patientId: string,
  enabled: boolean,
): PatientClinicalEventsIndex {
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
