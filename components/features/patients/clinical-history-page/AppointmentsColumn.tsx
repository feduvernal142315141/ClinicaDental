"use client";

import { useState } from "react";
import { Spin } from "antd";
import { Plus, Stethoscope, ClipboardList } from "lucide-react";
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

function parseDateParts(dateStr: string): {
  day: string;
  monthShort: string;
} {
  const MONTHS = [
    "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
    "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
  ];
  try {
    const d = new Date(dateStr + "T00:00:00");
    return {
      day: String(d.getDate()).padStart(2, "0"),
      monthShort: MONTHS[d.getMonth()],
    };
  } catch {
    return { day: "--", monthShort: "---" };
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
  const { day, monthShort } = parseDateParts(appointment.date);
  return (
    <div className="p-5 flex gap-4 hover:bg-muted/40 transition-colors">
      <div className="w-12 h-12 bg-blue-50 rounded-lg text-blue-600 flex flex-col items-center justify-center shrink-0">
        <span className="text-lg font-bold leading-none">{day}</span>
        <span className="text-[10px] font-semibold uppercase">{monthShort}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {appointment.serviceName ?? appointment.reason ?? "Consulta"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {appointment.time}
          {appointment.doctorName && ` · Dr. ${appointment.doctorName}`}
        </p>
        <div className="mt-2 flex gap-3 text-xs font-semibold">
          <button onClick={onCancel} className="text-red-500 hover:underline">
            Cancelar
          </button>
          <button onClick={onReschedule} className="text-blue-500 hover:underline">
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
  const { day, monthShort } = parseDateParts(appointment.date);
  return (
    <div className="p-5 flex gap-4 hover:bg-muted/40 transition-colors">
      <div className="w-12 h-12 bg-green-50 rounded-lg text-green-600 flex flex-col items-center justify-center shrink-0">
        <span className="text-lg font-bold leading-none">{day}</span>
        <span className="text-[10px] font-semibold uppercase">{monthShort}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {appointment.serviceName ?? appointment.reason ?? "Consulta"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
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
    <div className="flex flex-col h-full overflow-y-auto pl-3">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <>
          {/* Botón iniciar consulta — siempre al tope */}
          <div className="py-4">
            <button
              onClick={() => {
                if (startableAppointment && onStartConsultation) {
                  onStartConsultation(startableAppointment.id);
                }
              }}
              disabled={!startableAppointment || !onStartConsultation}
              className="w-full group flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-500 disabled:hover:bg-transparent"
            >
              <div className="bg-gray-100 group-hover:bg-blue-100 p-2 rounded-full transition-colors">
                <Plus className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm">Iniciar Nueva Consulta</span>
            </button>
          </div>

          {/* Consultas en curso */}
          {inProgress.length > 0 && <InProgressBanner appts={inProgress} />}

          {/* Consultas agendadas */}
          <section className="bg-card rounded-xl border border-border overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Consultas Agendadas
              </h3>
            </div>
            <div className="divide-y divide-border">
              {scheduled.length === 0 ? (
                <p className="text-xs text-muted-foreground p-5">
                  Sin consultas agendadas
                </p>
              ) : (
                scheduled.map((appt) => (
                  <ScheduledCard
                    key={appt.id}
                    appointment={appt}
                    onCancel={() => setCancelAppointment(appt)}
                    onReschedule={() => setRescheduleAppointment(appt)}
                  />
                ))
              )}
            </div>
          </section>

          {/* Consultas realizadas */}
          <section className="bg-card rounded-xl border border-border overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Consultas Realizadas
              </h3>
            </div>
            <div className="divide-y divide-border">
              {completed.length === 0 ? (
                <div className="p-8 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-3">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Sin consultas realizadas</p>
                </div>
              ) : (
                <>
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
                      className="text-xs text-blue-500 hover:underline py-3 text-center w-full"
                    >
                      Ver {completed.length - 5} más
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
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
