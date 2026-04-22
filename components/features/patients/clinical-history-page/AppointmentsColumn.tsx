"use client";

import { useState } from "react";
import { Badge as AntBadge, Button as AntButton, Spin, Tag } from "antd";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Play,
  X,
  RotateCcw,
} from "lucide-react";
import { CancelModal } from "@/components/features/appointments/scheduler/CancelModal";
import { RescheduleModal } from "@/components/features/appointments/scheduler/RescheduleModal";
import type { Appointment } from "@/lib/entity/appointment/appointments";

interface AppointmentsColumnProps {
  appointments: Appointment[];
  loading: boolean;
  patientId: string;
  activeAppointmentId?: string;
  onStartConsultation?: (appointmentId: string) => void;
  onViewOdontogram?: (visitId: string) => void;
}

function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
}: {
  appointment: Appointment;
  onCancel: () => void;
  onReschedule: () => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{appointment.date}</span>
          <Clock className="h-3.5 w-3.5 ml-1" />
          <span>{appointment.time}</span>
        </div>
        <Tag
          color={
            appointment.status === "scheduled"
              ? "blue"
              : appointment.status === "in_progress"
                ? "green"
                : "default"
          }
        >
          {appointment.status === "scheduled"
            ? "Agendada"
            : appointment.status === "in_progress"
              ? "En curso"
              : appointment.status}
        </Tag>
      </div>
      {appointment.doctorName && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          {appointment.doctorName}
        </div>
      )}
      {appointment.serviceName && (
        <p className="text-xs text-muted-foreground">{appointment.serviceName}</p>
      )}
      <div className="flex gap-2">
        <AntButton
          size="small"
          danger
          icon={<X className="h-3 w-3" />}
          onClick={onCancel}
          className="flex items-center gap-1"
        >
          Cancelar
        </AntButton>
        <AntButton
          size="small"
          icon={<RotateCcw className="h-3 w-3" />}
          onClick={onReschedule}
          className="flex items-center gap-1"
        >
          Reagendar
        </AntButton>
      </div>
    </div>
  );
}

function CompletedAppointmentCard({
  appointment,
  onViewOdontogram,
}: {
  appointment: Appointment;
  onViewOdontogram?: (visitId: string) => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{appointment.date}</span>
          <Clock className="h-3.5 w-3.5 ml-1" />
          <span>{appointment.time}</span>
        </div>
        <Tag color="green">Completada</Tag>
      </div>
      {appointment.doctorName && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          {appointment.doctorName}
        </div>
      )}
      {appointment.serviceName && (
        <p className="text-xs text-muted-foreground">{appointment.serviceName}</p>
      )}
      {onViewOdontogram && (
        <AntButton
          size="small"
          icon={<Stethoscope className="h-3 w-3" />}
          onClick={() => onViewOdontogram(appointment.id)}
          className="flex items-center gap-1"
        >
          Ver odontograma
        </AntButton>
      )}
    </div>
  );
}

export function AppointmentsColumn({
  appointments,
  loading,
  patientId: _patientId,
  activeAppointmentId,
  onStartConsultation,
  onViewOdontogram,
}: AppointmentsColumnProps) {
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const inProgress = appointments.filter((a) => a.status === "in_progress");
  const scheduled = appointments.filter((a) => a.status === "scheduled");
  const completed = appointments.filter((a) => a.status === "completed");

  const todayScheduled = scheduled.filter((a) => a.date === today);
  const startableAppointment =
    inProgress[0] ?? todayScheduled[0] ?? null;

  return (
    <Card className="h-full overflow-auto">
      <CardContent className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="flex gap-2">
              <AntBadge
                count={scheduled.length}
                showZero
                color="#1677ff"
                overflowCount={99}
              >
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600">
                  Próximas
                </span>
              </AntBadge>
              <AntBadge
                count={completed.length}
                showZero
                color="#52c41a"
                overflowCount={99}
              >
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-600">
                  Completadas
                </span>
              </AntBadge>
            </div>

            {/* Iniciar consulta */}
            {startableAppointment && onStartConsultation && (
              <AntButton
                type="primary"
                block
                style={{ background: "#16a34a" }}
                icon={<Play className="h-4 w-4" />}
                onClick={() => onStartConsultation(startableAppointment.id)}
                className="flex items-center justify-center gap-1"
              >
                Iniciar Consulta
              </AntButton>
            )}

            {/* En curso */}
            {inProgress.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                  En curso
                </p>
                {inProgress.map((appt) => (
                  <div
                    key={appt.id}
                    className={`rounded-md border border-green-300 bg-green-50 p-3 space-y-1 text-sm ${activeAppointmentId === appt.id ? "ring-2 ring-green-500" : ""}`}
                  >
                    <div className="flex items-center gap-1 text-green-800 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {appt.time}
                    </div>
                    {appt.doctorName && (
                      <p className="text-xs text-green-700">{appt.doctorName}</p>
                    )}
                    {appt.serviceName && (
                      <p className="text-xs text-green-700">{appt.serviceName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Agendadas */}
            {scheduled.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Agendadas
                </p>
                {scheduled.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onCancel={() => setCancelAppointment(appt)}
                    onReschedule={() => setRescheduleAppointment(appt)}
                  />
                ))}
              </div>
            )}

            {/* Realizadas */}
            {completed.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Realizadas
                </p>
                {completed.map((appt) => (
                  <CompletedAppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onViewOdontogram={onViewOdontogram}
                  />
                ))}
              </div>
            )}

            {appointments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin citas registradas
              </p>
            )}
          </>
        )}

        {/* Modales */}
        {cancelAppointment && (
          <CancelModal
            appointment={cancelAppointment}
            isOpen={true}
            onClose={() => setCancelAppointment(null)}
            onSuccess={() => setCancelAppointment(null)}
          />
        )}
        {rescheduleAppointment && (
          <RescheduleModal
            appointment={rescheduleAppointment}
            isOpen={true}
            onClose={() => setRescheduleAppointment(null)}
            onSuccess={() => setRescheduleAppointment(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
