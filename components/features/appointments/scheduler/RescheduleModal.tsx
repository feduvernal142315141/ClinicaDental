"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  DatePicker,
  TimePicker,
  Typography,
  Space,
  Alert,
  Spin,
  Button,
} from "antd";
import { CloseCircleOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useRescheduleAppointment } from "@/lib/hooks/appointments/use-reschedule-appointment";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";

const { Text } = Typography;

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

  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(
    startIso ? dayjs(startIso) : null,
  );
  const [selectedTime, setSelectedTime] = useState<Dayjs | null>(
    startIso ? dayjs(startIso) : null,
  );
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doctorId = appointment.doctorId ?? appointment.doctor_id ?? "";

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
    (date: Dayjs | null, time: Dayjs | null) => {
      if (!date || !time || !doctorId) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setCheckingAvailability(true);
        setAvailabilityError(null);
        try {
          const dateStr = date.format("YYYY-MM-DD");
          const slots = await appointmentsService.getDoctorAvailability(
            doctorId,
            dateStr,
          );
          const timeStr = time.format("HH:mm");
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
      setSelectedDate(startIso ? dayjs(startIso) : null);
      setSelectedTime(startIso ? dayjs(startIso) : null);
      setAvailabilityError(null);
    }
  }, [isOpen, startIso]);

  const handleOk = async () => {
    if (!selectedDate || !selectedTime) return;
    const newStart = selectedDate
      .hour(selectedTime.hour())
      .minute(selectedTime.minute())
      .second(0);
    const newEnd = newStart.add(originalDurationMinutes, "minute");
    await reschedule({
      scheduledStartAt: newStart.toISOString(),
      scheduledEndAt: newEnd.toISOString(),
    });
  };

  const isFormValid = !!selectedDate && !!selectedTime && !availabilityError;

  const computedEndTime =
    selectedDate && selectedTime
      ? selectedDate
          .hour(selectedTime.hour())
          .minute(selectedTime.minute())
          .second(0)
          .add(originalDurationMinutes, "minute")
          .format("HH:mm")
      : "—";

  return (
    <Modal
      title="Reagendar cita"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Text strong>Paciente: </Text>
          <Text>{appointment.patientName ?? "—"}</Text>
          <br />
          {appointment.doctorName && (
            <>
              <Text strong>Doctor: </Text>
              <Text>{appointment.doctorName}</Text>
              <br />
            </>
          )}
          {appointment.serviceName && (
            <>
              <Text strong>Servicio: </Text>
              <Text>{appointment.serviceName}</Text>
              <br />
            </>
          )}
        </div>

        <div>
          <Text strong>Nueva fecha *</Text>
          <br />
          <DatePicker
            style={{ width: "100%", marginTop: 4 }}
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            format="DD/MM/YYYY"
            disabledDate={(d) => d.isBefore(dayjs().startOf("day"))}
          />
        </div>

        <div>
          <Text strong>Nueva hora *</Text>
          <br />
          <Space style={{ marginTop: 4 }}>
            <TimePicker
              value={selectedTime}
              onChange={(time) => setSelectedTime(time)}
              format="HH:mm"
              minuteStep={15}
              showSecond={false}
            />
            <Text type="secondary">→ fin: {computedEndTime}</Text>
            {checkingAvailability && <Spin size="small" />}
          </Space>
        </div>

        {availabilityError && (
          <Alert message={availabilityError} type="warning" showIcon />
        )}

        {error && !availabilityError && (
          <Alert message={error} type="error" showIcon />
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="default"
            danger
            icon={<CloseCircleOutlined />}
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            style={{ flex: 1 }}
            loading={loading}
            disabled={!isFormValid || loading}
            onClick={handleOk}
          >
            Confirmar nueva fecha
          </Button>
        </div>
      </Space>
    </Modal>
  );
}
