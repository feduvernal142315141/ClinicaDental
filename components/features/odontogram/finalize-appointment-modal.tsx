"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  OdontogramButton,
  OdontogramCheckbox,
  OdontogramModal,
  OdontogramSelect,
} from "@/components/features/odontogram/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import { dateToLocalDate } from "@/lib/datetime";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  User,
  AlertCircle,
} from "lucide-react";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { doctorsService } from "@/lib/services/doctors/doctors.service";
import {
  useOdontogramStore,
  type OdontogramAdapter,
} from "@/lib/odontogram/store";
import { useTreatmentPlans } from "@/lib/hooks/odontogram/useTreatmentPlans";
import {
  useFinalizeAppointment,
  type FollowUpAppointmentInput,
} from "@/lib/hooks/appointments/use-finalize-appointment";
import type { AppointmentServiceSnapshot } from "@/lib/entity/appointment";

interface DoctorOption {
  id: string;
  label: string;
}

interface FinalizarCitaModalProps {
  open: boolean;
  onClose: () => void;
  visitId: string | undefined;
  patientId: string;
  clinicId: string;
  adapter: OdontogramAdapter;
  /** Callback opcional al finalizar con éxito. El parent puede refrescar listados. */
  onSuccess?: (result: { followUpId?: string }) => void;
}

/**
 * Modal FRONT-APPT-04 — Finalizar cita.
 *
 * Muestra resumen de procedimientos realizados + pendientes, permite programar
 * opcionalmente una cita de seguimiento con los servicios pendientes, y llama
 * al orquestador `useFinalizeAppointment` para persistir odontograma, cerrar
 * planes, marcar la cita como realizada y (opcional) crear el seguimiento.
 */
export function FinalizarCitaModal({
  open,
  onClose,
  visitId,
  patientId,
  clinicId,
  adapter,
  onSuccess,
}: FinalizarCitaModalProps) {
  const clinicalEvents = useOdontogramStore((state) => state.clinicalEvents);

  const performedEvents = useMemo(
    () =>
      clinicalEvents.filter(
        (ev) => ev.type === "performed" || ev.status === "done",
      ),
    [clinicalEvents],
  );

  const pendingPlanEvents = useMemo(
    () =>
      clinicalEvents.filter(
        (ev) =>
          ev.type === "plan" &&
          ev.status !== "done" &&
          ev.status !== "canceled",
      ),
    [clinicalEvents],
  );

  // ── Follow-up mini-form state ─────────────────────────────────────
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // ── Treatment plans loading ───────────────────────────────────────
  const { plans, fetchPlans } = useTreatmentPlans();

  useEffect(() => {
    if (!open || !patientId) return;
    fetchPlans(patientId, { page: 0, pageSize: 100 }).catch(() => {
      /* handled by hook */
    });
  }, [open, patientId, fetchPlans]);

  // ── Doctors for follow-up ─────────────────────────────────────────
  useEffect(() => {
    if (!open || !scheduleFollowUp) return;
    doctorsService
      .getDoctors({ page: 0, pageSize: 100 })
      .then((res) => {
        const items = (res.entities ?? []).map((d) => ({
          id: d.id,
          label: `${d.name}${d.specialty ? ` - ${d.specialty}` : ""}`,
        }));
        setDoctors(items);
      })
      .catch(() => setDoctors([]));
  }, [open, scheduleFollowUp]);

  useEffect(() => {
    if (!doctorId || !date) {
      setAvailableTimes([]);
      return;
    }
    setLoadingTimes(true);
    setTime("");
    appointmentsService
      .getDoctorAvailability(doctorId, date)
      .then((times) => setAvailableTimes(times))
      .catch(() => setAvailableTimes([]))
      .finally(() => setLoadingTimes(false));
  }, [doctorId, date]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setScheduleFollowUp(false);
      setDoctorId("");
      setDate("");
      setTime("");
      setAvailableTimes([]);
      setLocalError(null);
    }
  }, [open]);

  // ── Finalize orchestrator ─────────────────────────────────────────
  const { finalize, loading, error } = useFinalizeAppointment({
    visitId,
    patientId,
    clinicId,
    adapter,
  });

  // Planes pendientes REALMENTE agendables en el follow-up: excluye los que ya
  // tienen una cita futura vinculada (programados desde la pestaña Plan), para
  // no re-agendarlos ni contar su duración dos veces.
  const schedulablePendingEvents = useMemo(
    () =>
      pendingPlanEvents.filter(
        (ev) => ev.status !== "scheduled" && !ev.appointmentId,
      ),
    [pendingPlanEvents],
  );

  // Duración estimada del follow-up = suma durationMin de lo que se agenda
  // (fallback 30), coherente con pendingServices.
  const followUpDuration = useMemo(() => {
    const sum = schedulablePendingEvents.reduce(
      (acc, ev) => acc + (ev.durationMin ?? 30),
      0,
    );
    return sum > 0 ? sum : 30;
  }, [schedulablePendingEvents]);

  // Servicios pendientes para el follow-up. El evento del plan guarda el
  // `procedureId` (que es el id del servicio del catálogo); usamos serviceId si
  // existe y, si no, caemos a procedureId — así el bloque de servicios pendientes
  // aparece aunque el evento no haya persistido serviceId explícitamente.
  const pendingServices: AppointmentServiceSnapshot[] = useMemo(
    () =>
      schedulablePendingEvents
        .filter((ev) => !!(ev.serviceId || ev.procedureId))
        .map((ev) => ({
          serviceId: (ev.serviceId ?? ev.procedureId)!,
          serviceName: ev.serviceName ?? ev.procedureName ?? "Servicio",
          serviceCode: ev.serviceCode,
          serviceCost: ev.serviceCost ?? ev.cost ?? 0,
        })),
    [schedulablePendingEvents],
  );

  const followUpValid =
    !scheduleFollowUp ||
    (doctorId && date && time && pendingServices.length > 0);

  const canSubmit = !!visitId && !loading && followUpValid;

  const handleSubmit = useCallback(async () => {
    setLocalError(null);
    try {
      const followUp: FollowUpAppointmentInput | undefined = scheduleFollowUp
        ? {
            doctorId,
            date,
            time,
            duration: followUpDuration,
          }
        : undefined;

      const result = await finalize({
        treatmentPlans: plans,
        followUp,
        pendingServices: scheduleFollowUp ? pendingServices : undefined,
      });

      onSuccess?.(result);
      onClose();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "No se pudo finalizar la cita.",
      );
    }
  }, [
    scheduleFollowUp,
    doctorId,
    date,
    time,
    followUpDuration,
    plans,
    pendingServices,
    finalize,
    onSuccess,
    onClose,
  ]);

  const doctorOptions = doctors.map((d) => ({ value: d.id, label: d.label }));
  const timeOptions = availableTimes.map((t) => ({ value: t, label: t }));
  // Fecha mínima del seguimiento: MAÑANA (local). Finalizar cierra la visita del
  // día; el seguimiento es para "más adelante", coherente con SchedulePlanModal.
  const minFollowUpDate = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return dateToLocalDate(t);
  })();
  const combinedError = localError ?? error;

  return (
    <OdontogramModal
      open={open}
      onClose={onClose}
      title="Finalizar cita"
      description={`${performedEvents.length} procedimiento(s) realizado(s) · ${pendingPlanEvents.length} pendiente(s)`}
      width={520}
    >
      <div className="space-y-4 p-2">
        {/* Performed summary */}
        <Card className="p-3 bg-emerald-500/15 border-emerald-400/25">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Procedimientos realizados en esta cita
          </p>
          {performedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay procedimientos marcados como realizados.
            </p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {performedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    Diente {ev.toothNumber} —{" "}
                    {ev.serviceName ?? ev.procedureName ?? "Procedimiento"}
                  </span>
                  {ev.cost ? (
                    <Badge variant="outline" className="text-xs">
                      ${ev.cost.toFixed(2)}
                    </Badge>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending summary */}
        {pendingPlanEvents.length > 0 && (
          <Card className="p-3 bg-amber-500/15 border-amber-400/25">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-300 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Procedimientos pendientes del plan
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pendingPlanEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    Diente {ev.toothNumber} —{" "}
                    {ev.serviceName ?? ev.procedureName ?? "Procedimiento"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(ev.status === "scheduled" || ev.appointmentId) && (
                      <Badge
                        variant="outline"
                        className="text-xs border-sky-400/30 bg-sky-500/15 text-sky-500"
                      >
                        Ya agendado
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {ev.durationMin ?? 30} min
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Follow-up toggle */}
        {pendingPlanEvents.length > 0 && pendingServices.length > 0 && (
          <div className="space-y-3">
            <OdontogramCheckbox
              checked={scheduleFollowUp}
              onChange={setScheduleFollowUp}
            >
              Programar cita de seguimiento con los servicios pendientes
            </OdontogramCheckbox>

            {scheduleFollowUp && (
              <div className="space-y-3 pl-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Doctor
                  </label>
                  <OdontogramSelect
                    value={doctorId}
                    onChange={setDoctorId}
                    options={doctorOptions}
                    placeholder="Seleccionar doctor"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Fecha
                  </label>
                  <DateTimePicker
                    showTime={false}
                    min={minFollowUpDate}
                    value={date}
                    onChange={setDate}
                    aria-label="Fecha"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Hora disponible
                  </label>
                  {loadingTimes ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consultando disponibilidad...
                    </div>
                  ) : availableTimes.length > 0 ? (
                    <OdontogramSelect
                      value={time}
                      onChange={setTime}
                      options={timeOptions}
                      placeholder="Seleccionar hora"
                    />
                  ) : doctorId && date ? (
                    <p className="text-sm text-amber-600 dark:text-amber-300 flex items-center gap-1.5 py-2">
                      <AlertCircle className="w-4 h-4" />
                      No hay horarios disponibles para esta fecha
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      Seleccione doctor y fecha para ver horarios
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {combinedError && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {combinedError}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <OdontogramButton
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </OdontogramButton>
          <OdontogramButton
            variant="success"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {loading ? "Finalizando..." : "Finalizar cita"}
          </OdontogramButton>
        </div>
      </div>
    </OdontogramModal>
  );
}
