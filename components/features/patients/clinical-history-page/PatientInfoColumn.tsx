"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { User, Edit, AlertTriangle, ChevronRight } from "lucide-react";
import { PatientAttachmentsSection } from "@/components/features/patients/attachments/PatientAttachmentsSection";
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
    <section className="bento p-5 space-y-3">
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

      {/* ── Alerta: antecedentes sin revisar ──────────────────────────── */}
      {isReviewNeeded && (
        <section
          role="alert"
          className="rounded-xl border border-amber-300/70 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-900/15 p-4"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Antecedentes médicos sin revisar
              </p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                {medicalHistory?.validatedAt
                  ? "Última revisión hace más de 24 meses"
                  : "Sin revisión registrada"}
              </p>
              {onEditMedicalHistory && (
                <button
                  type="button"
                  onClick={onEditMedicalHistory}
                  className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  Revisar ahora
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </section>
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
