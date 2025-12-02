export interface Patient {
  id: string;
  clinic_id?: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
  gender?: string;
  agreement?: boolean;
}

export interface PatientFormData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export const genderOptions = [
  { id: "1", label: "Masculino" },
  { id: "2", label: "Femenino" },
  { id: "3", label: "Otro" },
  { id: "4", label: "Prefiero no decirlo" },
];

export const agreementOptions = [
  { id: "1", label: "Sí, acepto" },
  { id: "2", label: "No, no acepto" },
];
