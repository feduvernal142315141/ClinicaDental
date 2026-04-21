"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Checkbox } from "antd";
import {
  OdontogramModal,
  OdontogramSelect,
} from "@/components/features/odontogram/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Duración estimada del follow-up = suma durationMin de pending (fallback 30)
  const followUpDuration = useMemo(() => {
    const sum = pendingPlanEvents.reduce(
      (acc, ev) => acc + (ev.durationMin ?? 30),
      0,
    );
    return sum > 0 ? sum : 30;
  }, [pendingPlanEvents]);

  // Servicios pendientes para el follow-up (usando serviceId del evento)
  const pendingServices: AppointmentServiceSnapshot[] = useMemo(
    () =>
      pendingPlanEvents
        .filter((ev) => !!ev.serviceId)
        .map((ev) => ({
          serviceId: ev.serviceId!,
          serviceName: ev.serviceName ?? ev.procedureName ?? "Servicio",
          serviceCode: ev.serviceCode,
          serviceCost: ev.serviceCost ?? ev.cost ?? 0,
        })),
    [pendingPlanEvents],
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
  const today = new Date().toISOString().split("T")[0];
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
        <Card className="p-3 bg-green-50 border-green-200">
          <p className="text-xs font-medium text-green-800 mb-2 flex items-center gap-1.5">
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
          <Card className="p-3 bg-amber-50 border-amber-200">
            <p className="text-xs font-medium text-amber-800 mb-2 flex items-center gap-1.5">
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
                  <Badge variant="outline" className="text-xs">
                    {ev.durationMin ?? 30} min
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Follow-up toggle */}
        {pendingPlanEvents.length > 0 && pendingServices.length > 0 && (
          <div className="space-y-3">
            <Checkbox
              checked={scheduleFollowUp}
              onChange={(e) => setScheduleFollowUp(e.target.checked)}
            >
              Programar cita de seguimiento con los servicios pendientes
            </Checkbox>

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
                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    <p className="text-sm text-amber-600 flex items-center gap-1.5 py-2">
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
          <Button
            type="default"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            style={{ flex: 1, background: "#22c55e", borderColor: "#22c55e" }}
            onClick={handleSubmit}
            disabled={!canSubmit}
            icon={
              loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )
            }
          >
            {loading ? "Finalizando..." : "Finalizar cita"}
          </Button>
        </div>
      </div>
    </OdontogramModal>
  );
}
