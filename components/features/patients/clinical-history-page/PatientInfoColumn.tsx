"use client";

import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Heart,
  Droplets,
  Shield,
  AlertCircle,
  Edit,
} from "lucide-react";
import { PatientAttachmentsSection } from "@/components/features/patients/attachments/PatientAttachmentsSection";
import type { Patient } from "@/lib/entity/patients/patients";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
} from "@/lib/entity/clinical-history";

interface PatientInfoColumnProps {
  patient: Patient;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
  canUpload?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  activeAppointmentId?: string;
  onEditPatient?: () => void;
}

/** Extracts YYYY-MM-DD from any ISO date string, avoiding timezone shift */
function formatDateShort(isoDate?: string | null): string | null {
  if (!isoDate) return null;
  // Slice the first 10 chars is safe for all ISO formats: YYYY-MM-DDTHH:... or YYYY-MM-DD
  return isoDate.slice(0, 10);
}

/** Accurate age calculation that accounts for birth month/day */
function calculateAge(isoDate?: string | null): number | null {
  if (!isoDate) return null;
  const dateStr = isoDate.slice(0, 10); // YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasBirthdayPassed) age -= 1;
  return age;
}

function InfoRow({
  icon: Icon,
  value,
}: {
  icon: React.ElementType;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm text-muted-foreground break-all">{value}</span>
    </li>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function PatientInfoColumn({
  patient,
  medicalHistory,
  patientHeader,
  canUpload = false,
  canDelete = false,
  canEdit = true,
  activeAppointmentId,
  onEditPatient,
}: PatientInfoColumnProps) {

  const dobShort = formatDateShort(patient.dateOfBirth);
  const age = calculateAge(patient.dateOfBirth);

  const genderLabel =
    patient.gender === "male"
      ? "Masculino"
      : patient.gender === "female"
        ? "Femenino"
        : patient.gender ?? null;

  const profileMeta = [
    dobShort,
    age !== null ? `${age} años` : null,
    genderLabel,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-3 gap-5 py-2">
      {/* Profile card */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
          <User className="h-10 w-10 text-blue-400" />
        </div>
        <h2 className="text-lg font-bold leading-tight">{patient.name}</h2>
        {profileMeta && (
          <p className="text-sm text-muted-foreground mt-0.5">{profileMeta}</p>
        )}
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onEditPatient?.()}
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Editar Perfil
          </Button>
        )}
      </section>

      {/* Contacto */}
      <SectionCard title="Contacto">
        <ul className="space-y-3">
          <InfoRow icon={Mail} value={patient.email} />
          <InfoRow icon={Phone} value={patient.phone} />
          <InfoRow icon={MapPin} value={patient.address} />
        </ul>
      </SectionCard>

      {/* Datos personales (de antecedentes) */}
      {medicalHistory &&
        (medicalHistory.occupation || medicalHistory.maritalStatus) && (
          <SectionCard title="Datos Personales">
            <ul className="space-y-3">
              <InfoRow icon={Briefcase} value={medicalHistory.occupation} />
              <InfoRow icon={Heart} value={medicalHistory.maritalStatus} />
            </ul>
          </SectionCard>
        )}

      {/* Clínico (de patientHeader) */}
      {patientHeader &&
        (patientHeader.bloodType ||
          patientHeader.insurancePlan ||
          patientHeader.emergencyContact) && (
          <SectionCard title="Clínico">
            <ul className="space-y-3">
              <InfoRow icon={Droplets} value={patientHeader.bloodType} />
              <InfoRow icon={Shield} value={patientHeader.insurancePlan} />
              <InfoRow
                icon={AlertCircle}
                value={patientHeader.emergencyContact}
              />
            </ul>
          </SectionCard>
        )}

      {/* Archivos */}
      <SectionCard title="Archivos">
        <PatientAttachmentsSection
          patientId={patient.id}
          canUpload={canUpload}
          canDelete={canDelete}
          activeAppointmentId={activeAppointmentId}
        />
      </SectionCard>
    </div>
  );
}
