import { PatientLegacy as Patient } from "../entity/patients/patients";
import { supabase } from "../supabaseClient";


// Obtener todos los pacientes de una clínica
// export async function getPatients(clinic_id: string): Promise<Patient[]> {
//   console.log("👉 Entrando a getPatients con clinic_id:", clinic_id)

//   const { data, error } = await supabase
//     .from("patients")
//     .select("*")
//     .eq("clinic_id", clinic_id)
//     .order("created_at", { ascending: false })

//   console.log("🔙 Respuesta Supabase:", { data, error })

//   if (error) {
//     console.error("❌ Error en Supabase:", error)
//     throw error
//   }

//   return data ?? []
// }

export async function getPatients(clinic_id: string): Promise<Patient[]> {
  console.log("👉 Entrando a getPatients con clinic_id:", clinic_id)
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL")
  const query = supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinic_id)
    .order("created_at", { ascending: false });

  console.log("📡 Query generada:", query);

  const { data, error } = await query;

  console.log("✅ Respuesta:", { data, error });

  if (error) throw error;
  return data || [];
}


// Obtener un paciente por ID
export async function getPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// Crear paciente
export async function createPatient(patient: Omit<Patient, "id" | "created_at" | "updated_at">): Promise<Patient> {
  const dataForm = {...patient, clinic_id: patient.clinic_id};
  const { data, error } = await supabase
    .from("patients")
    .insert([dataForm])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Actualizar paciente
export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
  const { data, error } = await supabase
    .from("patients")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Eliminar paciente
export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}
