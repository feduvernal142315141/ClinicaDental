import { supabase } from "@/lib/supabaseClient";
import { Appointment } from "../entity/appointment/appointments";

export type { Appointment };

export async function getAppointmentsByDate(date: string, clinicId: string) {
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
      patient:patients!appointments_patient_id_fkey(id, name),
      doctor:doctors!appointments_doctor_id_fkey(id, name)
    `
    )
    .eq("clinic_id", clinicId)
    .eq("date", date);

  if (error) throw error;

  return data?.map((item) => {
    const a = item as {
      id: string;
      date: string;
      time: string;
      duration: number;
      status: Appointment["status"];
      type: Appointment["type"];
      notes?: string;
      patient?: Array<{ id: string; name: string }>;
      doctor?: Array<{ id: string; name: string }>;
      doctor_id?: string;
      clinic_id?: string;
    };

    return {
      id: a.id,
      date: a.date,
      time: a.time,
      duration: a.duration,
      status: a.status,
      type: a.type,
      notes: a.notes,
      patientId: a.patient?.[0]?.id ?? undefined,
      patient_id: a.patient?.[0]?.id ?? undefined,
      patientName: a.patient?.[0]?.name ?? "",
      doctorName: a.doctor?.[0]?.name ?? "",
      doctorId: a.doctor_id,
      doctor_id: a.doctor_id,
      clinicId: a.clinic_id,
      clinic_id: a.clinic_id,
    };
  }) as Appointment[];
}

export async function getAppointmentsByPatient(
  patientId: string
): Promise<Appointment[]> {
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
      patient_id,
      doctor_id,
      doctor:doctors!appointments_doctor_id_fkey(id, name)
    `
    )
    .eq("patient_id", patientId)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item) => {
    const a = item as {
      id: string;
      date: string;
      time: string;
      duration: number;
      status: Appointment["status"];
      type: Appointment["type"];
      notes?: string;
      reason?: string;
      patient_id?: string;
      doctor_id?: string;
      clinic_id?: string;
      doctor?: Array<{ id: string; name: string }>;
    };

    return {
      id: a.id,
      date: a.date,
      time: a.time,
      duration: a.duration,
      status: a.status,
      type: a.type,
      notes: a.notes,
      reason: a.reason,
      patientId: a.patient_id,
      patient_id: a.patient_id,
      doctorId: a.doctor_id,
      doctor_id: a.doctor_id,
      doctorName: a.doctor?.[0]?.name ?? "",
      clinicId: a.clinic_id,
      clinic_id: a.clinic_id,
    };
  });
}

export async function createAppointment(payload: Omit<Appointment, "id">) {
  const { data, error } = await supabase
    .from("appointments")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAppointment(
  id: string,
  payload: Partial<Appointment>
) {
  const { data, error } = await supabase
    .from("appointments")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment["status"]
) {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) throw error;
  return data;
}

export async function getDoctorAppointmentsInMonth(
  doctorId: string,
  year: number,
  month: number
): Promise<string[]> {
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  const { data, error } = await supabase
    .from("appointments")
    .select("date")
    .eq("doctor_id", doctorId)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])

  if (error) throw error

  const dates = (data ?? []).map((a) => a.date)
  return Array.from(new Set(dates))
}
