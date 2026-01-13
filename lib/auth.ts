/**
 * Este proyecto usa autenticación propia vía backend (OTP + JWT).
 * Supabase queda fuera del flujo de auth.
 */

export async function authenticateUser(): Promise<never> {
  throw new Error("authenticateUser no aplica en el flujo OTP/JWT");
}

export async function registerUser(): Promise<never> {
  throw new Error("Registro no implementado para el flujo OTP/JWT");
}

export interface ClinicUser {
  clinicId: string;
  role: string;
}

export interface AppUser {
  id: string;
  email?: string;
  clinicId: string | null;
  roleId: string | null;
  roleName: string;
  /** Optional permissions encoded as "module-value" bitmask strings (e.g. "role-3"). */
  permissions?: string[];
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  /** Inicia login (envía OTP al correo) */
  login: (email: string, password: string) => Promise<void>;
  /** Completa login (valida OTP y crea sesión) */
  completeOtpLogin: (
    otpCode: string,
    options?: {
      /** Si es false, no navega (útil para probar estilos). */
      redirect?: boolean;
    }
  ) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
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
];

export type UserRole = "admin" | "doctor" | "patient";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  specialization?: string; // For doctors
  patientId?: string; // For patients
}
