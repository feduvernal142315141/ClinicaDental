"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Empty, Skeleton, Tag } from "antd";
import { CalendarDays, Clock, Stethoscope } from "lucide-react";
import { SectionTitle, Card } from "@/components/ui/antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useAuth } from "@/lib/contexts/auth-context";
import { appointmentsService } from "@/lib/services/appointments";
import type { Appointment, AppointmentStatus } from "@/lib/entity/appointment";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programada",
  in_progress: "En curso",
  completed: "Realizada",
  cancelled: "Cancelada",
  "no-show": "No asistió",
  no_show: "No asistió",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "blue",
  in_progress: "green",
  completed: "purple",
  cancelled: "red",
  "no-show": "orange",
  no_show: "orange",
};

const STATUS_ORDER: AppointmentStatus[] = [
  "in_progress",
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
  "no_show",
];

export default function MyAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!user) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = await appointmentsService.getMyAppointments();
      setAppointments(sortAppointments(items));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar tus citas.",
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void loadAppointments();
  }, [authLoading, loadAppointments]);

  const groupedAppointments = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      items: appointments.filter((appointment) => appointment.status === status),
    })).filter((group) => group.items.length > 0);
  }, [appointments]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Mis Citas"
        subtitle="Consulta tus próximas citas, visitas en curso e historial de atención."
      />

      {error && (
        <Alert
          type="error"
          showIcon
          message="No se pudieron cargar tus citas"
          description={error}
          action={
            <Button type="button" variant="outline" size="sm" onClick={loadAppointments}>
              Reintentar
            </Button>
          }
        />
      )}

      {loading || authLoading ? (
        <Card title="Cargando citas">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : groupedAppointments.length === 0 ? (
        <Card title="Sin citas registradas">
          <Empty description="Aún no tienes citas asociadas a tu cuenta." />
        </Card>
      ) : (
        groupedAppointments.map(({ status, items }) => (
          <Card
            key={status}
            title={STATUS_LABELS[status]}
            subtitle={`${items.length} cita${items.length === 1 ? "" : "s"}`}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((appointment) => (
                <AppointmentPatientCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function AppointmentPatientCard({ appointment }: { appointment: Appointment }) {
  const displayDate = appointment.date
    ? formatDate(appointment.date)
    : "Fecha pendiente";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">
            {appointment.serviceName ?? appointment.reason ?? "Consulta"}
          </p>
          <p className="text-xs text-slate-500">
            {appointment.doctorName ? `Dr. ${appointment.doctorName}` : "Doctor por confirmar"}
          </p>
        </div>
        <Tag color={STATUS_COLORS[appointment.status]}>
          {STATUS_LABELS[appointment.status]}
        </Tag>
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <span>{displayDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <span>{appointment.time || "Hora pendiente"}</span>
          {appointment.duration > 0 && <span>· {appointment.duration} min</span>}
        </div>
        {appointment.type && (
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-blue-500" />
            <span>{formatAppointmentType(appointment.type)}</span>
          </div>
        )}
      </div>

      {appointment.notes && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          {appointment.notes}
        </p>
      )}
    </div>
  );
}

function sortAppointments(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => {
    const aTime = `${a.date || "9999-12-31"}T${a.time || "23:59"}`;
    const bTime = `${b.date || "9999-12-31"}T${b.time || "23:59"}`;
    return aTime.localeCompare(bTime);
  });
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}

function formatAppointmentType(type: Appointment["type"]): string {
  const labels: Record<Appointment["type"], string> = {
    consultation: "Consulta",
    control: "Control",
    emergency: "Emergencia",
    follow_up: "Seguimiento",
    routine: "Rutina",
  };

  return labels[type] ?? type;
}
