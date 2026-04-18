"use client";

import { use, useCallback, useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui/antd";
import { AppointmentForm } from "@/components/features/appointments/form/AppointmentForm";
import { useAppointments } from "@/lib/hooks/appointments";
import type { Appointment } from "@/lib/entity/appointment";
import { Skeleton } from "antd";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAppointmentPage({ params }: PageProps) {
  const { id } = use(params);
  const { getAppointmentById } = useAppointments();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAppointment = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAppointmentById(id);
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
        <SectionTitle
          title="Editar Cita"
          subtitle="Cargando datos de la cita..."
        />
        <Skeleton active paragraph={{ rows: 8 }} />
      </>
    );
  }

  return (
    <>
      <SectionTitle
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
