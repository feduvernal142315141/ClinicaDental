import { Patient } from "@/lib/entity/patients";
import { createClient } from "@/lib/supabase/server";

export async function usePatientDetails(id: string): Promise<Patient | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Patient;
}
