"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui";
import { User, Edit, AlertTriangle, ChevronRight } from "lucide-react";
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
  /**
   * Abre el flujo de edición de antecedentes médicos.
   * Cuando está definido, se muestra el botón "Revisar ahora" en el badge de alerta.
   * El padre sólo pasa esto cuando el usuario tiene permiso de edición.
   */
  onEditMedicalHistory?: () => void;
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
  onEditMedicalHistory,
}: PatientInfoColumnProps) {
  const { profileMeta, contactItems, personalItems, clinicalItems } =
    usePatientInfoColumn({
      patient,
      medicalHistory,
      patientHeader,
    });

  /**
   * Alerta de revisión de antecedentes:
   * Se muestra si no hay historia médica, si nunca fue validada, o si la última
   * validación/revisión supera los 24 meses.
   */
  const isReviewNeeded = useMemo<boolean>(() => {
    if (!medicalHistory) return true;
    const reviewDateStr = medicalHistory.validatedAt;
    if (!reviewDateStr) return true;
    const reviewDate = new Date(reviewDateStr);
    if (isNaN(reviewDate.getTime())) return true;
    const diffMs = Date.now() - reviewDate.getTime();
    // 24 meses ≈ 730.5 días
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 730;
  }, [medicalHistory]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-3 gap-5 py-2">
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
            <Edit className="h-3.5 w-3.5 mr-1" />
            Editar Perfil
          </Button>
        )}
      </section>

      {/* ── Alerta: antecedentes sin revisar ──────────────────────────── */}
      {isReviewNeeded && (
        <Alert variant="warning">
          <AlertTriangle />
          {/* `line-clamp-none`: la columna es de 280px fijos y el título ocupa
              dos líneas; el recorte por defecto de AlertTitle lo dejaría en
              "Antecedentes médicos sin…". */}
          <AlertTitle className="line-clamp-none">
            Antecedentes médicos sin revisar
          </AlertTitle>
          <AlertDescription>
            <p>
              {medicalHistory?.validatedAt
                ? "Última revisión hace más de 24 meses"
                : "Sin revisión registrada"}
            </p>
            {/* `ring-current`: el anillo de foco hereda el ámbar OPACO del
                propio Alert (`text-amber-700 dark:text-amber-300`). Un anillo
                de marca translúcido (`ring-brand/40`) sobre el tinte ámbar se
                quedaba en ~1,7:1 en ambos temas, muy por debajo del 3:1 que
                exige WCAG 2.2 SC 1.4.11 para el indicador de foco. */}
            {onEditMedicalHistory && (
              <button
                type="button"
                onClick={onEditMedicalHistory}
                className="mt-1 flex items-center gap-1 rounded font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                Revisar ahora
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

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
