"use client";

import { useMemo } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Heart,
  Droplets,
  Shield,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import type { Patient } from "@/lib/entity/patients";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
} from "@/lib/entity/clinical-history";

interface UsePatientInfoColumnParams {
  patient: Patient;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
}

export interface PatientInfoItem {
  icon: LucideIcon;
  value: string;
}

function formatDateShort(isoDate?: string | null): string | null {
  if (!isoDate) return null;
  return isoDate.slice(0, 10);
}

function calculateAge(isoDate?: string | null): number | null {
  if (!isoDate) return null;

  const dateStr = isoDate.slice(0, 10);
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age;
}

function toInfoItems(
  items: Array<{ icon: LucideIcon; value?: string | null }>,
) {
  return items.filter((item): item is PatientInfoItem => Boolean(item.value));
}

export function usePatientInfoColumn({
  patient,
  medicalHistory,
  patientHeader,
}: UsePatientInfoColumnParams) {
  return useMemo(() => {
    const dobShort = formatDateShort(patient.dateOfBirth);
    const age = calculateAge(patient.dateOfBirth);

    const genderLabel =
      patient.gender === "M"
        ? "Masculino"
        : patient.gender === "F"
          ? "Femenino"
          : (patient.gender ?? null);

    const profileMeta = [
      dobShort,
      age !== null ? `${age} años` : null,
      genderLabel,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" • ");

    const contactItems = toInfoItems([
      { icon: Mail, value: patient.email },
      { icon: Phone, value: patient.phone },
      { icon: MapPin, value: patient.address },
    ]);

    const personalItems = toInfoItems([
      { icon: Briefcase, value: medicalHistory?.occupation },
      { icon: Heart, value: medicalHistory?.maritalStatus },
    ]);

    const clinicalItems = toInfoItems([
      { icon: Droplets, value: patientHeader?.bloodType },
      { icon: Shield, value: patientHeader?.insurancePlan },
      { icon: AlertCircle, value: patientHeader?.emergencyContact },
    ]);

    return {
      profileMeta,
      contactItems,
      personalItems,
      clinicalItems,
    };
  }, [medicalHistory, patient, patientHeader]);
}
