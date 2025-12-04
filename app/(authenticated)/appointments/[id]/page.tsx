"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppointmentDetails } from "@/components/appointments/appointment-details";
import { Appointment } from "@/lib/entity/appointment/appointments";
import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { supabase } from "@/lib/supabaseClient";

export default function AppointmentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("appointments")
          .select(
            `
            id,
            date,
            time,
            duration,
            status,
            type,
            notes,
            reason,
            clinic_id,
            patient:patients!appointments_patient_id_fkey(id, name),
            doctor:doctors!appointments_doctor_id_fkey(id, name)
          `
          )
          .eq("id", appointmentId)
          .single();

        if (error) throw error;

        if (data) {
          setAppointment({
            id: data.id,
            date: data.date,
            time: data.time,
            duration: data.duration,
            status: data.status,
            type: data.type,
            notes: data.notes,
            reason: data.reason,
            clinic_id: data.clinic_id,
            patient_id: (data.patient as any)?.[0]?.id ?? "",
            patientName: (data.patient as any)?.[0]?.name ?? "",
            doctor_id: (data.doctor as any)?.[0]?.id ?? "",
            doctorName: (data.doctor as any)?.[0]?.name ?? "",
          });
        }
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError("No se pudo cargar la cita");
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId]);

  const handleClose = () => {
    router.push("/appointments");
  };

  const handleUpdate = () => {
    router.refresh();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detalles de la Cita"
          description="Cargando información..."
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-6">
        <PageHeader title="Error" description="No se pudo cargar la cita" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {error || "Cita no encontrada"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalles de la Cita"
        description="Información completa de la cita"
      />

      <AppointmentDetails
        appointment={appointment}
        onClose={handleClose}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
