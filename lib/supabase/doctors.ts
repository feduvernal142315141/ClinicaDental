import { supabase } from "@/lib/supabaseClient";
import { Doctor } from "../doctors";

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  is_active: boolean;
}

export async function getDoctors(clinicId: string) {
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("clinic_id", clinicId);

  if (error) throw error;
  return data as Doctor[];
}

export async function createDoctor(doctor: Partial<Doctor>) {
  const { data, error } = await supabase
    .from("doctors")
    .insert(doctor)
    .select()
    .single();

  if (error) throw error;
  return data as Doctor;
}

export async function updateDoctor(id: string, doctor: Partial<Doctor>) {
  const { data, error } = await supabase
    .from("doctors")
    .update(doctor)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Doctor;
}

export async function deleteDoctor(id: string) {
  const { error } = await supabase.from("doctors").delete().eq("id", id);
  if (error) throw error;
}

export async function saveDoctorSchedule(schedule: Partial<DoctorSchedule>) {
  const { data, error } = await supabase
    .from("doctor_schedules")
    .upsert(schedule)
    .select()
    .single();

  if (error) throw error;
  return data as DoctorSchedule;
}
