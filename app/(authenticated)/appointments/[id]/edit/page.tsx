"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/layout/page-header";
import { AppointmentForm } from "@/components/features/appointments/form/AppointmentForm";
import { useAppointments } from "@/lib/hooks/appointments";
import type { Appointment } from "@/lib/entity/appointment";
import { isAppointmentActionable } from "@/lib/utils/appointment-utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAppointmentPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { getAppointmentById } = useAppointments();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAppointment = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAppointmentById(id);
      if (!isAppointmentActionable(data)) {
        router.replace(`/appointments/${id}`);
        return;
      }
      setAppointment(data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  if (loading) {
    return (
      <>
        <PageHeader title="Editar Cita" subtitle="Cargando datos de la cita..." />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bento h-48 animate-pulse p-6" />
            ))}
          </div>
          <div className="bento h-64 animate-pulse p-6 lg:col-span-1" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Editar Cita"
        subtitle="Modifique los datos de la cita"
      />
      <AppointmentForm
        appointmentId={id}
        basePath="/appointments"
        initialData={appointment ?? undefined}
      />
    </>
  );
}
