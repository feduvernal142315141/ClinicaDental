"use client";

import { useState, useEffect, useCallback } from "react";
import { OdontogramModal } from "@/components/features/odontogram/ui";
import { OdontogramSelect } from "@/components/features/odontogram/ui";
import { Button } from "antd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, AlertCircle, Loader2 } from "lucide-react";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import { localTodayInput } from "@/lib/datetime";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { doctorsService } from "@/lib/services/doctors/doctors.service";
import { useOdontogramStore } from "@/lib/odontogram/store";
import type { ProcedurePlan } from "./types";
import type { AppointmentType } from "@/lib/entity/appointment/appointments";

interface DoctorOption {
  id: string;
  label: string;
}

interface SchedulePlanModalProps {
  open: boolean;
  onClose: () => void;
  plans: ProcedurePlan[];
  onScheduled?: (plans: ProcedurePlan[], appointmentId: string) => void;
}

export function SchedulePlanModal({
  open,
  onClose,
  plans,
  onScheduled,
}: SchedulePlanModalProps) {
  const metadata = useOdontogramStore((state) => state.metadata);
  const patientId = metadata.patientId;

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load doctors on mount
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  // Load available times when doctor + date change
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

  const totalDuration = plans.reduce(
    (sum, p) => sum + (p.durationMin ?? 30),
    0,
  );

  const pendingPlans = plans.filter((p) => p.status !== "done" && p.status !== "canceled");

  const canSubmit =
    doctorId && date && time && patientId && pendingPlans.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const appointmentId = await appointmentsService.createAppointment({
        patientId,
        doctorId,
        date,
        time,
        duration: totalDuration,
        type: "routine" as AppointmentType,
        status: "scheduled",
        notes: pendingPlans
          .map((p) => `Diente ${p.toothNumber}: ${p.displayName}`)
          .join("; "),
      });

      const now = new Date().toISOString();
      const updatedPlans = plans.map((p) =>
        p.status !== "done" && p.status !== "canceled"
          ? {
              ...p,
              status: "scheduled" as ProcedurePlan["status"],
              appointmentAt: `${date}T${time}:00`,
              updatedAt: now,
            }
          : p,
      );

      onScheduled?.(updatedPlans, appointmentId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al programar la cita",
      );
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    patientId,
    doctorId,
    date,
    time,
    totalDuration,
    pendingPlans,
    plans,
    onScheduled,
    onClose,
  ]);

  const doctorOptions = doctors.map((d) => ({
    value: d.id,
    label: d.label,
  }));

  const timeOptions = availableTimes.map((t) => ({
    value: t,
    label: t,
  }));

  // Minimum date: today (hora LOCAL — la regla de oro, no UTC).
  const today = localTodayInput();

  return (
    <OdontogramModal
      open={open}
      onClose={onClose}
      title="Programar tratamiento"
      description={`${pendingPlans.length} procedimiento(s) pendiente(s) · ${totalDuration} min estimados`}
      width={480}
    >
      <div className="space-y-4 p-2">
        {/* Plan summary */}
        <Card className="p-3 bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Procedimientos a programar
          </p>
          <div className="space-y-1">
            {pendingPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  Diente {plan.toothNumber} — {plan.displayName}
                </span>
                <Badge variant="outline" className="text-xs">
                  {plan.durationMin ?? 30} min
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Doctor selector */}
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

        {/* Date picker */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Fecha
          </label>
          <DateTimePicker
            showTime={false}
            min={today}
            value={date}
            onChange={setDate}
            aria-label="Fecha"
          />
        </div>

        {/* Time selector */}
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

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {error}
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
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          >
            {loading ? "Programando..." : "Programar cita"}
          </Button>
        </div>
      </div>
    </OdontogramModal>
  );
}
