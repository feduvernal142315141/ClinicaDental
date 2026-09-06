"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useVisitRecordsBatch,
  type VisitRecordState,
} from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import type { PatientAttachment } from "@/lib/entity/patientAttachment";
import { EvolutionScopeHeader } from "./EvolutionScopeHeader";
import { VisitEntryCard } from "./VisitEntryCard";
import { EvolutionFilterBar } from "./EvolutionFilterBar";
import { Button } from "@/components/ui";
import { matchesQuery } from "@/lib/utils/text";
import { CancelModal } from "@/components/features/appointments/scheduler/CancelModal";
import { RescheduleModal } from "@/components/features/appointments/scheduler/RescheduleModal";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

/** Tope que el backend aplica al listado; es la única señal de truncamiento. */
const BACKEND_PAGE_CAP = 100;

/** Cuántas tarjetas piden su registro al montar, sin esperar al scroll. */
const EAGER_COUNT = 8;

/** Consultas que se pintan de entrada. El resto entra por "cargar más". */
const VISIBLE_PAGE_SIZE = 6;

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

/**
 * "Julio 2026" a partir de un `YYYY-MM-DD`. Se compone a mano en vez de con
 * `new Date(...)`: parsear esa cadena como fecha la interpreta en UTC y en
 * America/La_Paz (la zona por defecto de la clínica) devuelve el mes anterior
 * los días 1.
 */
function formatMonthLabel(date?: string): string {
  if (!date) return "";
  const [year, month] = date.split("-");
  const index = Number(month) - 1;
  const name = MONTHS_ES[index];
  return name && year ? `${name} ${year}` : "";
}

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
  /**
   * Recibe los ids de las consultas que sobreviven al filtro, o `null` cuando no
   * hay filtro. Permite al host ofrecer "imprimir la selección" además del
   * expediente completo.
   */
  onSelectionChange?: (appointmentIds: string[] | null) => void;
  /** Imprime solo lo filtrado. El host decide qué documento emite. */
  onPrintSelection?: () => void;
  /** Se llama tras cancelar o reagendar, para que la lista deje de estar obsoleta. */
  onAppointmentsChanged?: () => void;
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
  onAppointmentsChanged,
  onSelectionChange,
  onPrintSelection,
}: EvolutionColumnProps) {
  // Cancelar y reagendar son MUTACIONES sobre la agenda. Sin permiso no se pasan
  // los handlers, así que los ítems del menú no existen en el DOM — ausentes, no
  // deshabilitados: un control deshabilitado insinúa que en otro contexto valdría.
  const { isAdmin, can } = usePermission();
  const canManageAppointments =
    isAdmin || can("appointments", PermissionAction.EDIT);
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(VISIBLE_PAGE_SIZE);

  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

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

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const a of ordered) {
      const year = Number(a.date?.slice(0, 4));
      if (Number.isFinite(year) && year > 1900) set.add(year);
    }
    return [...set].sort((a, b) => b - a);
  }, [ordered]);

  const doctors = useMemo(() => {
    const set = new Set<string>();
    for (const a of ordered) {
      const name = a.doctorName?.trim();
      if (name) set.add(name);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [ordered]);

  /**
   * Filtrado en memoria sobre los datos de la CITA. Se usa `matchesQuery` de
   * `lib/utils/text` —el normalizador canónico del repo— y no un `includes`
   * propio: en español "extraccion" tiene que encontrar "Extracción", y quien
   * busca en el sillón no escribe tildes.
   */
  const filtered = useMemo(() => {
    const q = query.trim();
    return ordered.filter((a) => {
      if (selectedYear !== null && Number(a.date?.slice(0, 4)) !== selectedYear) {
        return false;
      }
      if (selectedDoctor && a.doctorName?.trim() !== selectedDoctor) return false;
      if (!q) return true;
      const haystack = [
        a.services?.[0]?.serviceName,
        a.reason,
        a.type,
        a.doctorName,
        a.date,
      ]
        .filter(Boolean)
        .join(" ");
      return matchesQuery(haystack, q);
    });
  }, [ordered, query, selectedYear, selectedDoctor]);

  const hasFilters =
    query.trim().length > 0 || selectedYear !== null || selectedDoctor !== null;

  /**
   * Con un filtro puesto NO se pagina: el usuario ya acotó el conjunto y
   * esconderle parte de lo que pidió detrás de un "cargar más" convierte un
   * resultado de búsqueda en una verdad a medias.
   */
  const visible = useMemo(
    () => (hasFilters ? filtered : filtered.slice(0, visibleLimit)),
    [filtered, hasFilters, visibleLimit],
  );
  const remaining = hasFilters ? 0 : filtered.length - visible.length;

  // El host necesita saber qué hay filtrado para poder imprimir la selección.
  // Se avisa con los IDS y no con las citas: así el efecto no se redispara por
  // una identidad de array nueva con el mismo contenido.
  const selectionKey = hasFilters ? filtered.map((a) => a.id).join(",") : null;
  useEffect(() => {
    onSelectionChange?.(selectionKey ? selectionKey.split(",") : null);
  }, [selectionKey, onSelectionChange]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedYear(null);
    setSelectedDoctor(null);
    setVisibleLimit(VISIBLE_PAGE_SIZE);
  }, []);

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

  // Se piden las tarjetas VISIBLES, no las primeras del historial completo: con
  // un filtro puesto o tras "cargar más", las que hay que traer son otras. El
  // tope evita que quitar el filtro sobre 500 consultas dispare 500 peticiones.
  useEffect(() => {
    for (const appointment of visible.slice(0, EAGER_COUNT)) {
      requestRef.current(appointment.id);
    }
  }, [visible]);

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
        shownCount={filtered.length}
        truncated={truncated}
        onPrint={onPrint}
        printPreparing={printPreparing}
        printProgress={printProgress}
        onPrintSelection={hasFilters ? onPrintSelection : undefined}
        selectionCount={filtered.length}
      />
      <EvolutionFilterBar
        query={query}
        onQueryChange={setQuery}
        years={years}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        doctors={doctors}
        selectedDoctor={selectedDoctor}
        onDoctorChange={setSelectedDoctor}
        resultCount={filtered.length}
        totalCount={ordered.length}
        onClear={clearFilters}
      />

      {filtered.length === 0 ? (
        <section className="bento p-6">
          <p className="text-sm text-subtle">
            Ninguna consulta coincide con la búsqueda. Prueba con otro término o
            quita los filtros.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {visible.map((appointment, index) => {
            // Separador de mes: se pinta al CAMBIAR de mes respecto a la
            // tarjeta anterior. Rompe la monotonía del scroll y sitúa un
            // tratamiento antiguo de un vistazo, sin tener que leer fechas.
            const monthKey = appointment.date?.slice(0, 7) ?? "";
            const previousMonthKey =
              index > 0 ? (visible[index - 1].date?.slice(0, 7) ?? "") : null;
            const showMonth = monthKey !== "" && monthKey !== previousMonthKey;

            return (
              <div key={appointment.id}>
                {showMonth ? (
                  <div className="flex items-center gap-3 pb-2 pt-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-subtle">
                      {formatMonthLabel(appointment.date)}
                    </span>
                    <div className="h-px flex-1 bg-hairline" />
                  </div>
                ) : null}

                <div
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
                  onReschedule={canManageAppointments ? setRescheduleAppt : undefined}
                  onCancel={canManageAppointments ? setCancelAppt : undefined}
                  />
                </div>
              </div>
            );
          })}

          {/* Pie de paginación: dice cuánto se está viendo del total ANTES de
              ofrecer más. Sin ese recuento, un historial recortado se lee como
              el historial completo. */}
          {remaining > 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 pb-6 pt-3">
              <p className="text-xs text-subtle">
                Mostrando {visible.length} de {filtered.length} consultas
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setVisibleLimit((limit) => limit + VISIBLE_PAGE_SIZE)
                }
                className="rounded-xl px-5 text-xs font-medium"
              >
                Cargar consultas anteriores (
                {Math.min(VISIBLE_PAGE_SIZE, remaining)} más)
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Modales de agenda. Al cerrarse con éxito avisan al host para que
          recargue: sin eso la fila cancelada seguía pintada como "Agendada",
          con sus acciones vivas, hasta recargar la página entera. */}
      {cancelAppt ? (
        <CancelModal
          appointment={cancelAppt}
          isOpen
          onClose={() => setCancelAppt(null)}
          onSuccess={() => {
            setCancelAppt(null);
            onAppointmentsChanged?.();
          }}
        />
      ) : null}
      {rescheduleAppt ? (
        <RescheduleModal
          appointment={rescheduleAppt}
          isOpen
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => {
            setRescheduleAppt(null);
            onAppointmentsChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}

export default EvolutionColumn;
