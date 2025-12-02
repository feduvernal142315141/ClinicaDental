import { supabase } from "@/lib/supabaseClient"

export async function authenticateUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw new Error(error.message)

  const { data: clinicUser, error: clinicError } = await supabase
    .from("clinic_users")
    .select("clinic_id, role")
    .eq("user_id", data.user?.id)
    .single()

  if (clinicError) throw new Error(clinicError.message)

  return { ...data.user, ...clinicUser }
}

export async function registerUser({ email, password }: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw new Error(error.message)
  return data.user
}

export interface ClinicUser {
  clinicId: string
  role: string
}

export interface AppUser {
  id: string
  email?: string
  clinicId: string | null
  roleId: string | null
  roleName: string
}


export interface RegisterData {
  email: string
  password: string
}

export interface AuthContextType {
  user: AppUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  authError: string | null 
}

// Mock authentication functions - in production, replace with real API calls
export const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@clinic.com",
    name: "Dr. Admin",
    role: "admin",
    phone: "+1234567890",
  },
  {
    id: "2",
    email: "doctor@clinic.com",
    name: "Dr. García",
    role: "doctor",
    phone: "+1234567891",
    specialization: "Cardiología",
  },
  {
    id: "3",
    email: "patient@clinic.com",
    name: "Juan Pérez",
    role: "patient",
    phone: "+1234567892",
    patientId: "P001",
  },
]

export type UserRole = "admin" | "doctor" | "patient"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string
  specialization?: string // For doctors
  patientId?: string // For patients
}