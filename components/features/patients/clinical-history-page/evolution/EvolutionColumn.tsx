"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appointmentHasVisitRecord,
  useVisitRecordsBatch,
  type VisitRecordState,
} from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import { APPOINTMENT_TYPE_LABEL } from "@/lib/entity/appointment/appointments";
import type { PatientAttachment } from "@/lib/entity/patientAttachment";
import { EvolutionScopeHeader } from "./EvolutionScopeHeader";
import { VisitEntryCard } from "./VisitEntryCard";
import { EvolutionFilterBar } from "./EvolutionFilterBar";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { matchesQuery } from "@/lib/utils/text";
import { cn } from "@/lib/utils/utils";
import { CancelModal } from "@/components/features/appointments/scheduler/CancelModal";
import { RescheduleModal } from "@/components/features/appointments/scheduler/RescheduleModal";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

const BACKEND_PAGE_CAP = 100;

const EAGER_COUNT = 8;

const VISIBLE_PAGE_SIZE = 6;

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

function dateHaystack(date?: string): string {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  const monthName = MONTHS_ES[Number(month) - 1] ?? "";
  return [
    date,
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${day} de ${monthName} de ${year}`,
    `${monthName} ${year}`,
    monthName,
    year,
  ].join(" ");
}
function formatMonthLabel(date?: string): string {
  if (!date) return "";
  const [year, month] = date.split("-");
  const index = Number(month) - 1;
  const name = MONTHS_ES[index];
  return name && year ? `${name} ${year}` : "";
}
const OBSERVER_ROOT_MARGIN = "600px";
const IDLE_STATE: VisitRecordState = { status: "idle" };
export interface EvolutionColumnProps {
  patientId: string;
  appointments: Appointment[];
  loading: boolean;
  onPrint?: () => void;
  canViewClinicalHistory?: boolean;
  onSelectionChange?: (appointmentIds: string[] | null) => void;

  onPrintSelection?: () => void;

  onAppointmentsChanged?: () => void;
  appointmentsError?: unknown;
  scrollRootRef?: React.RefObject<HTMLElement | null>;
  invalidateAppointmentId?: string;
  invalidateToken?: number;
  printPreparing?: boolean;
  printProgress?: { loaded: number; total: number };
  attachmentsByAppointmentId?: Record<string, PatientAttachment[]>;
  onViewVisitOdontogram?: (appointment: Appointment) => void;
  onViewVisitAttachments?: (appointment: Appointment) => void;
}
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
  appointmentsError = null,
}: EvolutionColumnProps) {
  const { isAdmin, can } = usePermission();
  const canManageAppointments =
    isAdmin || can("appointments", PermissionAction.EDIT);
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(VISIBLE_PAGE_SIZE);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const withoutVisitRecord = useMemo(
    () =>
      new Set(
        appointments
          .filter((appointment) => !appointmentHasVisitRecord(appointment.status))
          .map((appointment) => appointment.id),
      ),
    [appointments],
  );

  const { records, request, retry, invalidate } = useVisitRecordsBatch(
    patientId,
    canViewClinicalHistory,
    withoutVisitRecord,
  );
  useEffect(() => {
    if (!invalidateToken || !invalidateAppointmentId) return;
    invalidate(invalidateAppointmentId);
  }, [invalidateToken, invalidateAppointmentId]);
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

  const filtered = useMemo(() => {
    const q = query.trim();
    return ordered.filter((a) => {
      if (selectedYear !== null && Number(a.date?.slice(0, 4)) !== selectedYear) {
        return false;
      }
      if (selectedDoctor && a.doctorName?.trim() !== selectedDoctor) return false;

      if (dateFrom && (a.date ?? "") < dateFrom) return false;
      if (dateTo && (a.date ?? "") > dateTo) return false;
      if (!q) return true;
      const haystack = [
        ...(a.services ?? []).map((service) => service.serviceName),
        a.notes,
        a.type ? APPOINTMENT_TYPE_LABEL[a.type] : null,
        a.doctorName,
        dateHaystack(a.date),
      ]
        .filter(Boolean)
        .join(" ");
      return matchesQuery(haystack, q);
    });
  }, [ordered, query, selectedYear, selectedDoctor, dateFrom, dateTo]);
  const hasFilters =
    query.trim().length > 0 ||
    selectedYear !== null ||
    selectedDoctor !== null ||
    dateFrom !== "" ||
    dateTo !== "";

  const visible = useMemo(
    () => (hasFilters ? filtered : filtered.slice(0, visibleLimit)),
    [filtered, hasFilters, visibleLimit],
  );
  const remaining = hasFilters ? 0 : filtered.length - visible.length;

  const selectionKey = hasFilters ? filtered.map((a) => a.id).join(",") : null;
  useEffect(() => {
    onSelectionChange?.(selectionKey ? selectionKey.split(",") : null);
  }, [selectionKey, onSelectionChange]);
  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedYear(null);
    setSelectedDoctor(null);
    setDateFrom("");
    setDateTo("");
    setVisibleLimit(VISIBLE_PAGE_SIZE);
  }, []);
  const truncated = appointments.length === BACKEND_PAGE_CAP;
  const requestRef = useRef(request);
  requestRef.current = request;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodesRef = useRef<Map<string, Element>>(new Map());
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
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
      { root: scrollRootRef?.current ?? null, rootMargin: OBSERVER_ROOT_MARGIN },
    );
    observerRef.current = observer;
    nodesRef.current.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
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
  if (appointmentsError && ordered.length === 0) {
    return (
      <div className="min-w-0">
        <EvolutionScopeHeader shownCount={0} truncated={false} onPrint={onPrint} printPreparing={printPreparing} printProgress={printProgress} />
        <section className="bento p-6">
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                No se pudo cargar el listado de consultas
              </p>
              <p className="mt-1 text-sm text-subtle">
                No estamos mostrando la evolución clínica de este paciente. Esto
                no significa que no tenga consultas registradas.
              </p>
              {onAppointmentsChanged ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAppointmentsChanged}
                  className="mt-3 pointer-coarse:h-11 pointer-coarse:px-4"
                >
                  Reintentar
                </Button>
              ) : null}
            </div>
          </div>
        </section>
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
      {appointmentsError ? (
        <section className="bento mb-3 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-xs text-subtle">
              <span className="font-medium text-ink">
                La última lectura del listado de consultas falló.
              </span>{" "}
              Lo que ves puede estar incompleto o desactualizado.
            </p>
            {onAppointmentsChanged ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAppointmentsChanged}
                className="shrink-0 pointer-coarse:h-11 pointer-coarse:px-4"
              >
                Reintentar
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
      {!canViewClinicalHistory ? (
        <section className="bento mb-3 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden="true" />
            <p className="min-w-0 text-xs text-subtle">
              <span className="font-medium text-ink">
                Estás viendo solo la agenda de este paciente.
              </span>{" "}
              Tu rol no permite ver la historia clínica, así que no se muestran
              las anotaciones de ninguna consulta. Lo que no se muestra aquí no
              significa que las consultas no tengan registro clínico.
            </p>
          </div>
        </section>
      ) : null}
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
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={(range) => {
          setDateFrom(range.from);
          setDateTo(range.to);
        }}
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
            const monthKey = appointment.date?.slice(0, 7) ?? "";
            const previousMonthKey =
              index > 0 ? (visible[index - 1].date?.slice(0, 7) ?? "") : null;
            const showMonth = monthKey !== "" && monthKey !== previousMonthKey;
            return (
              <div key={appointment.id}>
                {showMonth ? (
                  <div
                    className={cn(
                      "flex items-center gap-3 pb-2",
                      index === 0 ? "pt-0" : "pt-4",
                    )}
                  >
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
                  canViewClinicalHistory={canViewClinicalHistory}
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
