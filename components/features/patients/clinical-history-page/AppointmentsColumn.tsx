"use client";

import { useState } from "react";
import { Button as AntButton, Spin } from "antd";
import { Play, Stethoscope } from "lucide-react";
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase pt-4 pb-2 border-b border-border mb-1">
      {children}
    </p>
  );
}

function parseDateParts(dateStr: string): {
  day: string;
  monthShort: string;
  year: string;
} {
  const MONTHS = [
    "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
    "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
  ];
  try {
    // dateStr may be "YYYY-MM-DD" or similar
    const d = new Date(dateStr + "T00:00:00");
    return {
      day: String(d.getDate()).padStart(2, "0"),
      monthShort: MONTHS[d.getMonth()],
      year: String(d.getFullYear()),
    };
  } catch {
    return { day: "--", monthShort: "---", year: "----" };
  }
}

function ScheduledCard({
  appointment,
  onCancel,
  onReschedule,
}: {
  appointment: Appointment;
  onCancel: () => void;
  onReschedule: () => void;
}) {
  const { day, monthShort, year } = parseDateParts(appointment.date);
  return (
    <div className="flex border-b py-3 gap-3">
      <div className="flex flex-col items-center justify-start min-w-[40px] border-l-2 border-blue-500 pl-2">
        <span className="text-2xl font-bold leading-none text-blue-600">
          {day}
        </span>
        <span className="text-[10px] font-semibold text-blue-500 uppercase">
          {monthShort}
        </span>
        <span className="text-[10px] text-muted-foreground">{year}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {appointment.serviceName ?? appointment.reason ?? "Consulta"}
        </p>
        <p className="text-xs text-muted-foreground">
          {appointment.time}
          {appointment.doctorName && ` · Dr. ${appointment.doctorName}`}
        </p>
        <div className="flex gap-1 mt-1.5 items-center">
          <button
            onClick={onCancel}
            className="text-xs text-red-500 hover:underline"
          >
            Cancelar
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            onClick={onReschedule}
            className="text-xs text-blue-500 hover:underline"
          >
            Reagendar
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletedCard({
  appointment,
  onViewOdontogram,
}: {
  appointment: Appointment;
  onViewOdontogram?: (visitId: string) => void;
}) {
  const { day, monthShort, year } = parseDateParts(appointment.date);
  return (
    <div className="flex border-b py-3 gap-3">
      <div className="flex flex-col items-center justify-start min-w-[40px] border-l-2 border-green-500 pl-2">
        <span className="text-2xl font-bold leading-none text-green-600">
          {day}
        </span>
        <span className="text-[10px] font-semibold text-green-500 uppercase">
          {monthShort}
        </span>
        <span className="text-[10px] text-muted-foreground">{year}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {appointment.serviceName ?? appointment.reason ?? "Consulta"}
        </p>
        <p className="text-xs text-muted-foreground">
          {appointment.time}
          {appointment.doctorName && ` · Dr. ${appointment.doctorName}`}
        </p>
        {onViewOdontogram && (
          <button
            onClick={() => onViewOdontogram(appointment.id)}
            className="mt-1 text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <Stethoscope className="h-3 w-3" />
            Ver odontograma de esta visita
          </button>
        )}
      </div>
    </div>
  );
}

function InProgressBanner({ appts }: { appts: Appointment[] }) {
  return (
    <div className="rounded-md bg-green-50 border border-green-300 px-3 py-2 mb-2">
      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
        En curso
      </p>
      {appts.map((appt) => (
        <div key={appt.id} className="text-xs text-green-800">
          {appt.time}
          {appt.doctorName && ` · ${appt.doctorName}`}
          {appt.serviceName && ` — ${appt.serviceName}`}
        </div>
      ))}
    </div>
  );
}

export function AppointmentsColumn({
  appointments,
  loading,
  patientId: _patientId,
  activeAppointmentId: _activeAppointmentId,
  onStartConsultation,
  onViewOdontogram,
}: AppointmentsColumnProps) {
  const [cancelAppointment, setCancelAppointment] =
    useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<Appointment | null>(null);
  const [showAll, setShowAll] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const inProgress = appointments.filter((a) => a.status === "in_progress");
  const scheduled = appointments.filter((a) => a.status === "scheduled");
  const completed = appointments.filter((a) => a.status === "completed");

  const todayScheduled = scheduled.filter((a) => a.date === today);
  const startableAppointment = inProgress[0] ?? todayScheduled[0] ?? null;

  return (
    <div className="flex flex-col h-full overflow-y-auto pl-3 border-l border-border">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <>
          {/* Botón iniciar consulta — siempre al tope */}
          <div className="py-4">
            <AntButton
              type="primary"
              block
              size="large"
              icon={<Play className="h-4 w-4" />}
              onClick={() => {
                if (startableAppointment && onStartConsultation) {
                  onStartConsultation(startableAppointment.id);
                }
              }}
              disabled={!startableAppointment || !onStartConsultation}
              style={{ height: 44, fontSize: 15, fontWeight: 600 }}
            >
              Iniciar Nueva Consulta
            </AntButton>
          </div>

          {/* Consultas en curso */}
          {inProgress.length > 0 && <InProgressBanner appts={inProgress} />}

          {/* Consultas agendadas */}
          <SectionLabel>CONSULTAS AGENDADAS</SectionLabel>
          {scheduled.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              Sin consultas agendadas
            </p>
          )}
          {scheduled.map((appt) => (
            <ScheduledCard
              key={appt.id}
              appointment={appt}
              onCancel={() => setCancelAppointment(appt)}
              onReschedule={() => setRescheduleAppointment(appt)}
            />
          ))}

          {/* Consultas realizadas */}
          <SectionLabel>CONSULTAS REALIZADAS</SectionLabel>
          {completed.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              Sin consultas realizadas
            </p>
          )}
          {completed
            .slice(0, showAll ? undefined : 5)
            .map((appt) => (
              <CompletedCard
                key={appt.id}
                appointment={appt}
                onViewOdontogram={onViewOdontogram}
              />
            ))}
          {completed.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-blue-500 hover:underline py-2 text-center w-full"
            >
              Ver {completed.length - 5} más
            </button>
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
    </div>
  );
}
