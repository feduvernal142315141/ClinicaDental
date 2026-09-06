"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useVisitRecordsBatch,
  type VisitRecordState,
} from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import { EvolutionScopeHeader } from "./EvolutionScopeHeader";
import { VisitEntryCard } from "./VisitEntryCard";

/** Tope que el backend aplica al listado; es la única señal de truncamiento. */
const BACKEND_PAGE_CAP = 100;

/** Cuántas tarjetas piden su registro al montar, sin esperar al scroll. */
const EAGER_COUNT = 8;

/** Margen del observer: pide el registro bastante antes de que se vea. */
const OBSERVER_ROOT_MARGIN = "600px";

const IDLE_STATE: VisitRecordState = { status: "idle" };

export interface EvolutionColumnProps {
  patientId: string;
  appointments: Appointment[];
  loading: boolean;
  onPrint?: () => void;
  printPreparing?: boolean;
  printProgress?: { loaded: number; total: number };
}

/**
 * Columna izquierda de la pestaña "Evolución clínica": el listado cronológico
 * de consultas con su registro clínico, en modo LECTURA.
 *
 * No tiene scroll propio a propósito (ADR-36: una sola superficie con scroll
 * por vista, y aquí es un ancestro). Crece con su contenido.
 */
export function EvolutionColumn({
  patientId,
  appointments,
  loading,
  onPrint,
  printPreparing,
  printProgress,
}: EvolutionColumnProps) {
  const { records, request, retry } = useVisitRecordsBatch(patientId);

  /**
   * El backend ordena por `createAt` — cuándo se AGENDÓ la cita, no cuándo se
   * atendió — así que reordenar en cliente por fecha+hora de atención no es
   * cosmético: sin esto la evolución se lee en un orden que no es el clínico.
   * La consulta en curso va siempre primera.
   */
  const ordered = useMemo(() => {
    const visible = appointments.filter(
      (appointment) => appointment.status !== "cancelled",
    );
    return visible.sort((a, b) => {
      const aRunning = a.status === "in_progress" ? 1 : 0;
      const bRunning = b.status === "in_progress" ? 1 : 0;
      if (aRunning !== bRunning) return bRunning - aRunning;
      const aKey = `${a.date ?? ""}T${a.time ?? ""}`;
      const bKey = `${b.date ?? ""}T${b.time ?? ""}`;
      return bKey.localeCompare(aKey);
    });
  }, [appointments]);

  // El backend descarta la metadata de paginación: llegar justo al tope es lo
  // único de lo que se puede deducir que hay consultas anteriores sin listar.
  const truncated = appointments.length === BACKEND_PAGE_CAP;

  // `request` puede cambiar de identidad en cada render del hook; guardarlo en
  // una ref evita reconstruir el observer (y perder lo ya observado).
  const requestRef = useRef(request);
  requestRef.current = request;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodesRef = useRef<Map<string, Element>>(new Map());

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // Sin observer (entornos sin soporte): se piden todos, antes que dejar
      // tarjetas colgadas en "idle" para siempre.
      nodesRef.current.forEach((_node, id) => requestRef.current(id));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.appointmentId;
          if (id) requestRef.current(id);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: OBSERVER_ROOT_MARGIN },
    );
    observerRef.current = observer;
    nodesRef.current.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);

  const registerNode = useCallback((id: string, node: HTMLElement | null) => {
    const nodes = nodesRef.current;
    const previous = nodes.get(id);
    if (previous && previous !== node) {
      observerRef.current?.unobserve(previous);
      nodes.delete(id);
    }
    if (node) {
      nodes.set(id, node);
      observerRef.current?.observe(node);
    }
  }, []);

  // Las primeras tarjetas se piden al montar: son las que el clínico ve sin
  // desplazarse y no deben depender de que el observer dispare.
  useEffect(() => {
    for (const appointment of ordered.slice(0, EAGER_COUNT)) {
      requestRef.current(appointment.id);
    }
  }, [ordered]);

  if (loading && ordered.length === 0) {
    return (
      <div className="min-w-0">
        <EvolutionScopeHeader shownCount={0} truncated={false} onPrint={onPrint} printPreparing={printPreparing} printProgress={printProgress} />
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <section key={index} className="bento overflow-hidden p-4">
              <div className="grid grid-cols-[76px_1fr] gap-3" aria-hidden="true">
                <div className="space-y-2 border-r border-hairline pr-3">
                  <div className="mx-auto h-6 w-8 animate-pulse rounded bg-hover" />
                  <div className="mx-auto h-3 w-12 animate-pulse rounded bg-hover" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-40 animate-pulse rounded-full bg-hover" />
                  <div className="h-3 w-56 animate-pulse rounded bg-hover" />
                  <div className="h-3 w-full animate-pulse rounded bg-hover" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-hover" />
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (ordered.length === 0) {
    return (
      <div className="min-w-0">
        <EvolutionScopeHeader shownCount={0} truncated={truncated} onPrint={onPrint} printPreparing={printPreparing} printProgress={printProgress} />
        <section className="bento p-6">
          <p className="text-sm text-subtle">
            Este paciente no tiene consultas registradas en el sistema
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <EvolutionScopeHeader
        shownCount={ordered.length}
        truncated={truncated}
        onPrint={onPrint}
          printPreparing={printPreparing}
          printProgress={printProgress}
      />
      <div className="space-y-3">
        {ordered.map((appointment, index) => (
          <div
            key={appointment.id}
            data-appointment-id={appointment.id}
            ref={(node) => registerNode(appointment.id, node)}
          >
            <VisitEntryCard
              appointment={appointment}
              state={records[appointment.id] ?? IDLE_STATE}
              onRetry={() => retry(appointment.id)}
              isLast={index === ordered.length - 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default EvolutionColumn;
