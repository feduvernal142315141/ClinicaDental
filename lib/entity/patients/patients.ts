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
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

export const agreementOptions = [
  { value: true, label: "Sí" },
  { value: false, label: "No" },
];
