"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Separator } from "@/components/ui/primitives/shadcn/separator";
import { Card, CardContent } from "@/components/ui/card";
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
  Paperclip,
  Edit,
} from "lucide-react";
import type { Patient } from "@/lib/entity/patients/patients";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
} from "@/lib/entity/clinical-history";

interface PatientInfoColumnProps {
  patient: Patient;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
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
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

export function PatientInfoColumn({
  patient,
  medicalHistory,
  patientHeader,
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
        : patient.gender ?? "No especificado";

  return (
    <Card className="h-full overflow-auto">
      <CardContent className="p-4 space-y-4">
        {/* Avatar + nombre */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-base">{patient.name}</p>
            {age !== null && (
              <p className="text-sm text-muted-foreground">{age} años</p>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {genderLabel}
          </div>
        </div>

        <Separator />

        {/* Datos de contacto */}
        <div className="space-y-2">
          <InfoRow icon={Mail} label="Email" value={patient.email} />
          <InfoRow icon={Phone} label="Teléfono" value={patient.phone} />
          <InfoRow icon={MapPin} label="Dirección" value={patient.address} />
          <InfoRow
            icon={Calendar}
            label="Nacimiento"
            value={patient.dateOfBirth}
          />
        </div>

        {medicalHistory && (
          <>
            <Separator />
            <div className="space-y-2">
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
            </div>
          </>
        )}

        {patientHeader && (
          <>
            <Separator />
            <div className="space-y-2">
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
            </div>
          </>
        )}

        <Separator />

        {/* Archivos */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4" />
            Archivos
          </div>
          <p className="text-xs text-muted-foreground">
            Sin archivos adjuntos
          </p>
          <Button variant="outline" size="sm" disabled className="w-full text-xs">
            Agregar archivo (próximamente)
          </Button>
        </div>

        <Separator />

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => router.push(`/patients/${patient.id}/edit`)}
        >
          <Edit className="mr-2 h-4 w-4" />
          Editar datos
        </Button>
      </CardContent>
    </Card>
  );
}
