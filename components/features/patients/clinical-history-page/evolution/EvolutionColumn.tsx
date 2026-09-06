"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useVisitRecordsBatch,
  type VisitRecordState,
} from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import type { PatientAttachment } from "@/lib/entity/patientAttachment";
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
  /**
   * El rol puede LEER la historia clínica. Sin esto el feed pedía el registro de
   * cada visita y cada 403 abría el diálogo modal global.
   */
  canViewClinicalHistory?: boolean;
  /** Contenedor con scroll real, para que el observer mida contra él. */
  scrollRootRef?: React.RefObject<HTMLElement | null>;
  /**
   * Marca de tiempo del último guardado de notas hecho FUERA de este feed (el
   * editor de la consulta en curso). Al cambiar, la tarjeta de esa visita se
   * vuelve a pedir para no seguir mostrando el texto anterior.
   */
  invalidateAppointmentId?: string;
  invalidateToken?: number;
  printPreparing?: boolean;
  printProgress?: { loaded: number; total: number };
  /**
   * Adjuntos que el host atribuye a cada cita, indexados por `appointmentId`.
   * Opcional a propósito: el listado de adjuntos del paciente NO devuelve
   * `appointmentId`, así que sólo el host puede saber (si es que lo sabe) qué
   * archivo pertenece a qué visita. Sin este mapa las tarjetas no pintan pills.
   */
  attachmentsByAppointmentId?: Record<string, PatientAttachment[]>;
  /**
   * Acciones de LECTURA del menú "⋯" de cada tarjeta. Sin ninguna de las dos,
   * la tarjeta no pinta el menú.
   */
  onViewVisitOdontogram?: (appointment: Appointment) => void;
  onViewVisitAttachments?: (appointment: Appointment) => void;
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
  canViewClinicalHistory = true,
  scrollRootRef,
  invalidateAppointmentId,
  invalidateToken,
  printPreparing,
  printProgress,
  attachmentsByAppointmentId,
  onViewVisitOdontogram,
  onViewVisitAttachments,
}: EvolutionColumnProps) {
  const { records, request, retry, invalidate } = useVisitRecordsBatch(
    patientId,
    canViewClinicalHistory,
  );

  // El editor de la consulta en curso guarda por otra vía; sin esto la tarjeta
  // de esa misma visita se quedaba congelada en el texto de la carga inicial.
  useEffect(() => {
    if (!invalidateToken || !invalidateAppointmentId) return;
    invalidate(invalidateAppointmentId);
    // `invalidate` es estable; el disparo lo marca el token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidateToken, invalidateAppointmentId]);

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
      // Sin `root` la raíz es el viewport del documento, y entre las tarjetas y
      // el viewport hay DOS ancestros que recortan (el TabsContent y el <main>).
      // Los rectángulos de recorte intermedios se aplican sin expandir, así que
      // el `rootMargin` no adelantaba nada: la precarga que promete el nombre no
      // ocurría. Se toma el scroller real cuando el host lo proporciona.
      { root: scrollRootRef?.current ?? null, rootMargin: OBSERVER_ROOT_MARGIN },
    );
    observerRef.current = observer;
    nodesRef.current.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
    // `scrollRootRef` es una ref estable del host: entra en las deps para
    // silenciar la regla, pero su identidad no cambia entre renders, así que el
    // observer no se reconstruye ni pierde los nodos ya observados.
  }, [scrollRootRef]);

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
              <div className="space-y-2" aria-hidden="true">
                <div className="h-4 w-64 animate-pulse rounded bg-hover" />
                <div className="h-3 w-40 animate-pulse rounded bg-hover" />
                <div className="h-3 w-full animate-pulse rounded bg-hover" />
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
              // `ordered` ya pone primero la consulta en curso y, si no la hay,
              // la más reciente: esa es la que nace desplegada. El resto se
              // leen plegadas, con su resumen de una línea.
              defaultExpanded={index === 0}
              attachments={attachmentsByAppointmentId?.[appointment.id]}
              onViewOdontogram={onViewVisitOdontogram}
              onViewAttachments={onViewVisitAttachments}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default EvolutionColumn;
