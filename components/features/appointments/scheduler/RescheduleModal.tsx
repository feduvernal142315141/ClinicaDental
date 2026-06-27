"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  CalendarClock,
  CalendarCheck,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import dayjs from "dayjs";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Select } from "@/components/ui/controls/select";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import { localTodayInput } from "@/lib/datetime";
import { useRescheduleAppointment } from "@/lib/hooks/appointments/use-reschedule-appointment";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";

interface RescheduleModalProps {
  appointment: {
    id: string;
    doctorId?: string;
    doctor_id?: string;
    patientName?: string;
    doctorName?: string;
    serviceName?: string;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    date?: string;
    time?: string;
    duration?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Opciones de hora en pasos de 15 minutos (00:00 … 23:45). */
const BASE_TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const value = `${pad2(Math.floor(i / 4))}:${pad2((i % 4) * 15)}`;
  return { value, label: value };
});

function getISOFromAppt(appt: RescheduleModalProps["appointment"]): {
  startIso: string | undefined;
  endIso: string | undefined;
} {
  if (appt.scheduledStartAt) {
    const start = dayjs(appt.scheduledStartAt);
    const end = appt.scheduledEndAt
      ? dayjs(appt.scheduledEndAt)
      : start.add(appt.duration ?? 30, "minute");
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }
  if (appt.date && appt.time) {
    const start = dayjs(`${appt.date}T${appt.time}`);
    const end = start.add(appt.duration ?? 30, "minute");
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }
  return { startIso: undefined, endIso: undefined };
}

export function RescheduleModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const { startIso, endIso } = getISOFromAppt(appointment);

  const originalDurationMinutes =
    startIso && endIso
      ? dayjs(endIso).diff(dayjs(startIso), "minute")
      : (appointment.duration ?? 30);

  // Estado en strings locales: fecha 'YYYY-MM-DD' y hora 'HH:mm'.
  const [selectedDate, setSelectedDate] = useState<string>(
    startIso ? dayjs(startIso).format("YYYY-MM-DD") : "",
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    startIso ? dayjs(startIso).format("HH:mm") : "",
  );
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doctorId = appointment.doctorId ?? appointment.doctor_id ?? "";

  // Incluye la hora actual aunque no caiga en un múltiplo de 15 min.
  const timeOptions = useMemo(() => {
    if (
      selectedTime &&
      !BASE_TIME_OPTIONS.some((o) => o.value === selectedTime)
    ) {
      return [{ value: selectedTime, label: selectedTime }, ...BASE_TIME_OPTIONS];
    }
    return BASE_TIME_OPTIONS;
  }, [selectedTime]);

  const { reschedule, loading, error } = useRescheduleAppointment(
    appointment.id,
    {
      onSuccess: () => {
        onSuccess();
        onClose();
      },
    },
  );

  // Availability check with debounce
  const checkAvailability = useCallback(
    (dateStr: string, timeStr: string) => {
      if (!dateStr || !timeStr || !doctorId) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setCheckingAvailability(true);
        setAvailabilityError(null);
        try {
          const slots = await appointmentsService.getDoctorAvailability(
            doctorId,
            dateStr,
          );
          if (slots.length > 0 && !slots.includes(timeStr)) {
            setAvailabilityError("El doctor no está disponible en ese horario");
          } else {
            setAvailabilityError(null);
          }
        } catch {
          setAvailabilityError(null); // don't block the form on error
        } finally {
          setCheckingAvailability(false);
        }
      }, 500);
    },
    [doctorId],
  );

  useEffect(() => {
    if (isOpen) {
      checkAvailability(selectedDate, selectedTime);
    }
  }, [selectedDate, selectedTime, isOpen, checkAvailability]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(startIso ? dayjs(startIso).format("YYYY-MM-DD") : "");
      setSelectedTime(startIso ? dayjs(startIso).format("HH:mm") : "");
      setAvailabilityError(null);
    }
  }, [isOpen, startIso]);

  const handleOk = async () => {
    if (!selectedDate || !selectedTime) return;
    const newStart = dayjs(`${selectedDate}T${selectedTime}`).second(0);
    const newEnd = newStart.add(originalDurationMinutes, "minute");
    await reschedule({
      scheduledStartAt: newStart.toISOString(),
      scheduledEndAt: newEnd.toISOString(),
    });
  };

  const isFormValid = !!selectedDate && !!selectedTime && !availabilityError;

  const computedEndTime =
    selectedDate && selectedTime
      ? dayjs(`${selectedDate}T${selectedTime}`)
          .second(0)
          .add(originalDurationMinutes, "minute")
          .format("HH:mm")
      : "—";

  return (
    <Modal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      icon={<CalendarClock className="h-5 w-5" />}
      title="Reagendar cita"
      description="Selecciona la nueva fecha y hora. Validaremos la disponibilidad del doctor."
      className="w-full sm:max-w-lg"
      footer={
        <>
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleOk}
            loading={loading}
            disabled={!isFormValid || loading}
          >
            <CalendarCheck className="h-4 w-4" />
            Confirmar nueva fecha
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pb-5">
        <dl className="space-y-1 rounded-xl border border-hairline bg-elevated px-4 py-3 text-sm">
          <div className="flex gap-2">
            <dt className="text-subtle">Paciente:</dt>
            <dd className="font-medium text-ink">
              {appointment.patientName ?? "—"}
            </dd>
          </div>
          {appointment.doctorName && (
            <div className="flex gap-2">
              <dt className="text-subtle">Doctor:</dt>
              <dd className="font-medium text-ink">{appointment.doctorName}</dd>
            </div>
          )}
          {appointment.serviceName && (
            <div className="flex gap-2">
              <dt className="text-subtle">Servicio:</dt>
              <dd className="font-medium text-ink">{appointment.serviceName}</dd>
            </div>
          )}
        </dl>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">
            Nueva fecha <span className="text-rose-500">*</span>
          </label>
          <DateTimePicker
            value={selectedDate}
            onChange={setSelectedDate}
            showTime={false}
            min={localTodayInput()}
            aria-label="Nueva fecha"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">
            Nueva hora <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select
                value={selectedTime}
                onChange={setSelectedTime}
                options={timeOptions}
                placeholder="Selecciona hora"
                aria-label="Nueva hora"
              />
            </div>
            <span className="whitespace-nowrap text-sm text-subtle">
              → fin: {computedEndTime}
            </span>
            {checkingAvailability && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-subtle" />
            )}
          </div>
        </div>

        {availabilityError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{availabilityError}</span>
          </div>
        )}

        {error && !availabilityError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
