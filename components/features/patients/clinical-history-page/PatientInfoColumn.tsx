"use client";

import { Button } from "@/components/ui/primitives/shadcn/button";
import { User, Edit } from "lucide-react";
import { PatientAttachmentsSection } from "@/components/features/patients/attachments/PatientAttachmentsSection";
import { SECTION_LABEL_CLASS } from "./section-label";
import type { Patient } from "@/lib/entity/patients";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
} from "@/lib/entity/clinical-history";
import { usePatientInfoColumn } from "@/lib/hooks/patients/clinical-history-page/use-patient-info-column";

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
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
      <span className="text-sm text-subtle break-all">{value}</span>
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
    <section className="bento p-5 space-y-3">
      <h3 className={SECTION_LABEL_CLASS}>{title}</h3>
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
  const { profileMeta, contactItems, personalItems, clinicalItems } =
    usePatientInfoColumn({
      patient,
      medicalHistory,
      patientHeader,
    });

  // NOTA: aquí vivía la alerta "Antecedentes médicos sin revisar", retirada a
  // propósito. Dependía de `medicalHistory.validatedAt`, cuyo ÚNICO escritor es
  // `PATCH /clinical-history/patients/{id}/medical-history/validate`, y el único
  // llamador de ese endpoint en el front es `ClinicalHistoryPanel`, un componente
  // antd que quedó huérfano al borrarse su host. Guardar antecedentes no escribe
  // el flag, así que el aviso salía en la ficha de TODOS los pacientes y no había
  // forma de cerrarlo, tuvieran los antecedentes completos o no.
  //
  // No se cablea un botón de "confirmar revisión" porque la atestación clínica
  // (quién revisó y cuándo, congelada por visita) pertenece a la capa legal que
  // está diferida junto con el consentimiento y la auditoría Envers. El aviso
  // vuelve cuando esa capa se retome de verdad; hasta entonces prometía una
  // revisión que el sistema no sabe registrar.
  //
  // Editar antecedentes NO se pierde: sigue disponible desde la propia columna de
  // antecedentes (`MedicalAntecedentsColumn`, con su `onEditClick`).

  return (
    <div className="flex flex-col pr-3 gap-5 py-2">
      {/* Profile card */}
      <section className="bento p-6 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-brand/15 border border-brand/25 flex items-center justify-center mb-3">
          <User className="h-10 w-10 text-brand" />
        </div>
        <h2 className="text-lg font-bold leading-tight">{patient.name}</h2>
        {profileMeta && (
          <p className="text-sm text-subtle mt-0.5">{profileMeta}</p>
        )}
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onEditPatient?.()}
          >
            {/* "Editar datos" y no "Editar Perfil": el botón abre la ficha de
                datos, y "Perfil" hacía esperar una foto del paciente que el
                sistema no soporta. Es además el texto que especificaba la HU
                original (HU-CLIN-001), así que esto revierte una deriva. */}
            <Edit className="h-3.5 w-3.5 mr-1" />
            Editar datos
          </Button>
        )}
      </section>

      {/* Contacto */}
      <SectionCard title="Contacto">
        <ul className="space-y-3">
          {contactItems.map((item) => (
            <InfoRow
              key={`${item.icon.displayName ?? item.icon.name}-${item.value}`}
              icon={item.icon}
              value={item.value}
            />
          ))}
        </ul>
      </SectionCard>

      {/* Datos personales (de antecedentes) */}
      {personalItems.length > 0 && (
        <SectionCard title="Datos Personales">
          <ul className="space-y-3">
            {personalItems.map((item) => (
              <InfoRow
                key={`${item.icon.displayName ?? item.icon.name}-${item.value}`}
                icon={item.icon}
                value={item.value}
              />
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Clínico (de patientHeader) */}
      {clinicalItems.length > 0 && (
        <SectionCard title="Clínico">
          <ul className="space-y-3">
            {clinicalItems.map((item) => (
              <InfoRow
                key={`${item.icon.displayName ?? item.icon.name}-${item.value}`}
                icon={item.icon}
                value={item.value}
              />
            ))}
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
