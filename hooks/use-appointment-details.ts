import { Appointment } from "@/lib/entity/appointment/appointments";
import { createClient } from "@/lib/supabase/server";

export async function useAppointmentDetails(
  id: string
): Promise<Appointment | null> {
  const supabase = createClient();

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
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
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
  };
}
