import type { PatientFormValues } from "./patient.schema";

/**
 * @deprecated Usar `PatientFormValues` de `@/lib/entity/patients`.
 * Este alias se mantiene temporalmente para no romper importaciones existentes.
 */
export type PatientFormData = PatientFormValues;

export const genderOptions = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

export const agreementOptions = [
  { value: true, label: "Sí" },
  { value: false, label: "No" },
];
