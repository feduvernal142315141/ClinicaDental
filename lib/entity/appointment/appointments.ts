import { supabase } from "../../supabaseClient"

export interface Appointment {
  id: string;
  date: string;
  time: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  type: "consultation" | "control" | "emergency";
  notes?: string;
  patient_id: string;
  patientName?: string;
  doctor_id: string;
  doctorName?: string;
  clinic_id: string;
  reason: string;
}

export interface TimeSlot {
  time: string
  available: boolean
  appointmentId?: string
}

export interface AvailabilityResponse {
    availableTime: string[];
}

export interface RequestCreateAppointment{
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    duration: number;
    status: "scheduled" | "completed" | "cancelled" | "no-show";
    type: "consultation" | "control" | "emergency";
    notes?: string;
}


export async function getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .order("date", { ascending: true })

  if (error) throw error
  return data
}