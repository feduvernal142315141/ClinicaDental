"use client";

import { useCallback, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  OdontogramModal,
  OdontogramButton,
} from "@/components/features/odontogram/ui";
import { Select } from "@/components/ui/controls/select";
import { AvailabilityCalendar } from "@/components/features/appointments/form/AvailabilityCalendar";
import { AvailabilitySlotPicker } from "@/components/features/appointments/form/AvailabilitySlotPicker";
import { DoctorScheduleSummary } from "@/components/features/appointments/form/DoctorScheduleSummary";
import { useDoctorAvailability } from "@/lib/hooks/appointments/use-doctor-availability";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { useOdontogramStore } from "@/lib/odontogram/store";
import { notify } from "@/lib/utils/notify";
import { dateToLocalDate } from "@/lib/datetime";
import {
  Calendar,
  CalendarPlus,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";
import type { ProcedurePlan } from "./types";

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
  const patientId = useOdontogramStore((state) => state.metadata.patientId);

  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo planes AÚN NO agendados: excluye done/canceled y los que ya tienen cita
  // vinculada (status 'scheduled' o appointmentId), para no duplicar citas.
  const isSchedulable = (p: ProcedurePlan) =>
    p.status !== "done" &&
    p.status !== "canceled" &&
    p.status !== "scheduled" &&
    !p.appointmentId;

  const pendingPlans = useMemo(() => plans.filter(isSchedulable), [plans]);

  // Duración reservada = SOLO lo que realmente se agenda.
  const totalDuration = useMemo(
    () => pendingPlans.reduce((sum, p) => sum + (p.durationMin ?? 30), 0),
    [pendingPlans],
  );

  // Fecha mínima: MAÑANA (hora LOCAL). Una cita de seguimiento es para "más
  // adelante"; para tratar en la sesión actual está "Realizar ahora".
  const minScheduleDate = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return dateToLocalDate(t);
  }, []);

  const {
    doctorOptions,
    doctorsLoading,
    doctorSchedule,
    disabledDate,
    isWorkingDay,
    selectedDayWorked,
    availableTimes,
    availabilityLoading,
  } = useDoctorAvailability({
    enabled: open,
    doctorId,
    date,
    duration: totalDuration,
  });

  // El calendario deshabilita días no laborables/pasados del doctor y, además,
  // hoy (mínimo = mañana).
  const combinedDisabledDate = useCallback(
    (d: Dayjs) => disabledDate(d) || d.isBefore(dayjs(minScheduleDate), "day"),
    [disabledDate, minScheduleDate],
  );

  const doctorSelectOptions = useMemo(
    () =>
      doctorOptions.map((d) => ({
        value: d.id,
        label: d.specialty ? `${d.name} · ${d.specialty}` : d.name,
      })),
    [doctorOptions],
  );

  const handleDoctorChange = (value: string) => {
    setDoctorId(value);
    setTime("");
    setError(null);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setTime("");
  };

  const canSubmit = Boolean(
    doctorId &&
      date &&
      time &&
      patientId &&
      pendingPlans.length > 0 &&
      date >= minScheduleDate,
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !patientId) return;
    setLoading(true);
    setError(null);

    try {
      const appointmentId = await appointmentsService.createAppointment({
        patientId,
        doctorId,
        date,
        time,
        duration: totalDuration,
        // Cita generada desde el plan de tratamiento del odontograma → seguimiento.
        type: "follow_up",
        status: "scheduled",
        notes: pendingPlans
          .map((p) => `Diente ${p.toothNumber}: ${p.displayName}`)
          .join("; "),
      });

      const now = new Date().toISOString();
      const updatedPlans = plans.map((p) =>
        isSchedulable(p)
          ? {
              ...p,
              status: "scheduled" as ProcedurePlan["status"],
              appointmentAt: `${date}T${time}:00`,
              appointmentId,
              updatedAt: now,
            }
          : p,
      );

      notify.success("Cita programada", {
        description:
          "Los procedimientos pendientes quedaron agendados; revisa la cita en la agenda del paciente.",
      });

      onScheduled?.(updatedPlans, appointmentId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo programar la cita.",
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

  return (
    <OdontogramModal
      open={open}
      onClose={onClose}
      title="Programar tratamiento"
      description={`${pendingPlans.length} procedimiento(s) pendiente(s) · seguimiento del plan`}
      width={780}
    >
      <div className="space-y-5">
        {/* Resumen de procedimientos a programar */}
        <div className="rounded-2xl border border-hairline bg-elevated p-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">
            Procedimientos a programar
          </p>
          <div className="space-y-1.5">
            {pendingPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between gap-3 text-sm text-ink"
              >
                <span className="truncate">
                  Diente {plan.toothNumber} — {plan.displayName}
                </span>
                <span className="shrink-0 rounded-full border border-hairline bg-surface px-2 py-0.5 text-xs tabular-nums text-subtle">
                  {plan.durationMin ?? 30} min
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 text-sm">
            <span className="text-subtle">Duración total estimada</span>
            <span className="font-semibold tabular-nums text-ink">
              {totalDuration} min
            </span>
          </div>
        </div>

        {/* Doctor */}
        <div className="space-y-1.5">
          <label
            htmlFor="schedule-doctor"
            className="flex items-center gap-1.5 text-sm font-medium text-ink"
          >
            <User className="h-3.5 w-3.5 text-subtle" />
            Doctor <span className="text-rose-500">*</span>
          </label>
          <Select
            id="schedule-doctor"
            value={doctorId}
            onChange={handleDoctorChange}
            options={doctorSelectOptions}
            placeholder={
              doctorsLoading ? "Cargando doctores…" : "Seleccionar doctor"
            }
            disabled={doctorsLoading}
            searchable
          />
          {!doctorsLoading && doctorOptions.length === 0 && (
            <p className="text-xs text-subtle">
              No hay doctores disponibles para agendar.
            </p>
          )}
        </div>

        {/* Horario del doctor seleccionado */}
        {doctorId && (
          <DoctorScheduleSummary schedule={doctorSchedule} ready={!!doctorId} />
        )}

        {/* Fecha + Hora */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Calendar className="h-3.5 w-3.5 text-subtle" />
              Fecha <span className="text-rose-500">*</span>
            </label>
            <AvailabilityCalendar
              value={date}
              onChange={handleDateChange}
              disabledDate={combinedDisabledDate}
              isWorkingDay={isWorkingDay}
              disabled={!doctorId}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Clock className="h-3.5 w-3.5 text-subtle" />
              Hora <span className="text-rose-500">*</span>
            </label>
            <AvailabilitySlotPicker
              value={time}
              onChange={setTime}
              availableTimes={availableTimes}
              loading={availabilityLoading}
              ready={Boolean(doctorId && date)}
              dayWorked={selectedDayWorked}
            />
          </div>
        </div>

        {/* Error de programación */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2 border-t border-hairline pt-4">
          <OdontogramButton
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </OdontogramButton>
          <OdontogramButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            loading={loading}
            icon={<CalendarPlus className="h-4 w-4" />}
          >
            {loading ? "Programando…" : "Programar cita"}
          </OdontogramButton>
        </div>
      </div>
    </OdontogramModal>
  );
}
