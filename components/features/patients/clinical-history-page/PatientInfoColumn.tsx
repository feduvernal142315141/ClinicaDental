"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Separator } from "@/components/ui/primitives/shadcn/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
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
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm mb-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <span className="text-muted-foreground text-xs">{label}: </span>
        <span className="font-medium text-xs">{value}</span>
      </div>
    </div>
  );
}

export function PatientInfoColumn({
  patient,
  medicalHistory,
  patientHeader,
  canUpload = false,
  canDelete = false,
}: PatientInfoColumnProps) {
  const router = useRouter();

  const age = patient.dateOfBirth
    ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
    : null;

  const genderLabel =
    patient.gender === "male"
      ? "Masculino"
      : patient.gender === "female"
        ? "Femenino"
        : patient.gender ?? null;

  const dob = patient.dateOfBirth ?? null;

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-3 border-r border-border">
      {/* Avatar + nombre + edad — zona prominente */}
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
          <User className="h-10 w-10 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight">{patient.name}</h2>
          <p className="text-sm text-muted-foreground">
            {dob && <span>{dob}</span>}
            {dob && age !== null && <span> · </span>}
            {age !== null && <span>{age} años</span>}
            {genderLabel && (
              <span className="ml-1 text-muted-foreground">· {genderLabel}</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/patients/${patient.id}/edit`)}
        >
          <Edit className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
      </div>

      <Separator />

      <SectionBlock title="CONTACTO">
        <InfoRow icon={Mail} label="Email" value={patient.email} />
        <InfoRow icon={Phone} label="Teléfono" value={patient.phone} />
        <InfoRow icon={MapPin} label="Dirección" value={patient.address} />
        <InfoRow icon={Calendar} label="Nacimiento" value={patient.dateOfBirth} />
      </SectionBlock>

      {medicalHistory && (
        <>
          <Separator />
          <SectionBlock title="DATOS PERSONALES">
            <InfoRow
              icon={Briefcase}
              label="Ocupación"
              value={medicalHistory.occupation}
            />
            <InfoRow
              icon={Heart}
              label="Estado civil"
              value={medicalHistory.maritalStatus}
            />
          </SectionBlock>
        </>
      )}

      {patientHeader && (
        <>
          <Separator />
          <SectionBlock title="CLÍNICO">
            <InfoRow
              icon={Droplets}
              label="Tipo de sangre"
              value={patientHeader.bloodType}
            />
            <InfoRow
              icon={Shield}
              label="Plan de seguro"
              value={patientHeader.insurancePlan}
            />
            <InfoRow
              icon={AlertCircle}
              label="Contacto emergencia"
              value={patientHeader.emergencyContact}
            />
          </SectionBlock>
        </>
      )}

      <Separator />

      <SectionBlock title="ARCHIVOS">
        <PatientAttachmentsSection
          patientId={patient.id}
          canUpload={canUpload}
          canDelete={canDelete}
        />
      </SectionBlock>
    </div>
  );
}
