"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Empty, Skeleton, Tag } from "antd";
import { CalendarDays, Clock, FileText, Stethoscope } from "lucide-react";
import { SectionTitle, Card } from "@/components/ui/antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useAuth } from "@/lib/contexts/auth-context";
import { appointmentsService } from "@/lib/services/appointments";
import type { Appointment, AppointmentStatus } from "@/lib/entity/appointment";

const HISTORY_STATUSES: AppointmentStatus[] = ["completed", "no-show", "no_show"];

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

export default function PatientHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = await appointmentsService.getMyAppointments();
      setAppointments(sortAppointmentsDesc(items));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar tu historial clínico.",
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void loadHistory();
  }, [authLoading, loadHistory]);

  const historicalAppointments = useMemo(
    () => appointments.filter((appointment) => HISTORY_STATUSES.includes(appointment.status)),
    [appointments],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Historial"
        subtitle="Revisa tus visitas realizadas y registros históricos disponibles."
      />

      {error && (
        <Alert
          type="error"
          showIcon
          message="No se pudo cargar tu historial"
          description={error}
          action={
            <Button type="button" variant="outline" size="sm" onClick={loadHistory}>
              Reintentar
            </Button>
          }
        />
      )}

      {loading || authLoading ? (
        <Card title="Cargando historial">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : historicalAppointments.length === 0 ? (
        <Card title="Sin historial disponible">
          <Empty description="Aún no tienes visitas realizadas en tu historial." />
        </Card>
      ) : (
        <Card
          title="Visitas registradas"
          subtitle={`${historicalAppointments.length} visita${historicalAppointments.length === 1 ? "" : "s"}`}
        >
          <div className="space-y-3">
            {historicalAppointments.map((appointment) => (
              <HistoryAppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function HistoryAppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <p className="font-semibold text-slate-900">
              {appointment.serviceName ?? appointment.reason ?? "Consulta"}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            {appointment.doctorName ? `Dr. ${appointment.doctorName}` : "Doctor por confirmar"}
          </p>
        </div>

        <Tag color={STATUS_COLORS[appointment.status]}>
          {STATUS_LABELS[appointment.status]}
        </Tag>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          <span>{appointment.date ? formatDate(appointment.date) : "Fecha pendiente"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <span>{appointment.time || "Hora pendiente"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-blue-500" />
          <span>{formatAppointmentType(appointment.type)}</span>
        </div>
      </div>

      {appointment.notes && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          {appointment.notes}
        </p>
      )}
    </div>
  );
}

function sortAppointmentsDesc(items: Appointment[]): Appointment[] {
  return [...items].sort((a, b) => {
    const aTime = `${a.date || "0000-01-01"}T${a.time || "00:00"}`;
    const bTime = `${b.date || "0000-01-01"}T${b.time || "00:00"}`;
    return bTime.localeCompare(aTime);
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
