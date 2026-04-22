"use client";

import { useState } from "react";
import { Tag, Badge } from "antd";
import { AlertTriangle, Edit } from "lucide-react";
import { Separator } from "@/components/ui/primitives/shadcn/separator";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { MedicalHistoryDrawer } from "@/components/features/clinical-history/sections/MedicalHistoryDrawer";
import { ClinicalNotesEditor } from "@/components/features/clinical-history/notes/ClinicalNotesEditor";
import { useClinicalNotes } from "@/lib/hooks/clinical-history";
import { TreatmentPlansPendingSection } from "./TreatmentPlansPendingSection";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
  AlertSeverity,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";
import { ALERT_SEVERITY_COLORS } from "@/lib/entity/clinical-history";

const SEVERITY_BADGE_STATUS: Record<
  AlertSeverity,
  "error" | "warning" | "processing"
> = {
  critical: "error",
  warning: "warning",
  info: "processing",
};

interface MedicalAntecedentsColumnProps {
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
  patientId: string;
  onMedicalHistoryUpdated?: () => void;
  canEdit?: boolean;
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

function TagList({
  items,
  color,
  emptyText,
}: {
  items: string[];
  color: string;
  emptyText: string;
}) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Tag key={item} color={color}>
          {item}
        </Tag>
      ))}
    </div>
  );
}

export function MedicalAntecedentsColumn({
  medicalHistory,
  patientHeader,
  patientId,
  onMedicalHistoryUpdated,
  canEdit = false,
}: MedicalAntecedentsColumnProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const { saving, save } = useClinicalNotes(
    patientId,
    medicalHistory?.clinicalNotes,
  );

  const handleSaveDrawer = async (_data: UpdateMedicalHistoryRequest) => {
    setDrawerLoading(true);
    try {
      // TODO: call update service
      onMedicalHistoryUpdated?.();
      setDrawerOpen(false);
    } finally {
      setDrawerLoading(false);
    }
  };

  const alerts = patientHeader?.alerts ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4">
      {/* Alertas — banner al tope */}
      {alerts.length > 0 && (
        <div className="py-3 rounded-md bg-red-50 border border-red-200 px-3 my-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
              Alertas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <Badge
                key={alert.id}
                status={SEVERITY_BADGE_STATUS[alert.severity]}
                color={ALERT_SEVERITY_COLORS[alert.severity]}
                text={alert.message}
              />
            ))}
          </div>
        </div>
      )}

      {/* Antecedentes */}
      <SectionBlock title="ANTECEDENTES">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Alergias
            </p>
            <TagList
              items={medicalHistory?.allergies ?? []}
              color="red"
              emptyText="Sin alergias registradas"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Medicamentos actuales
            </p>
            <TagList
              items={medicalHistory?.currentMedications ?? []}
              color="blue"
              emptyText="Sin medicamentos registrados"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Cirugías previas
            </p>
            <TagList
              items={medicalHistory?.previousSurgeries ?? []}
              color="orange"
              emptyText="Sin cirugías registradas"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Enfermedades sistémicas
            </p>
            <TagList
              items={medicalHistory?.systemicDiseases ?? []}
              color="purple"
              emptyText="Sin enfermedades sistémicas registradas"
            />
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="h-7 text-xs mt-1"
            >
              <Edit className="mr-1 h-3 w-3" />
              Editar antecedentes
            </Button>
          )}
        </div>
      </SectionBlock>

      <Separator />

      {/* Planes pendientes */}
      <SectionBlock title="PLANES PENDIENTES">
        <TreatmentPlansPendingSection patientId={patientId} />
      </SectionBlock>

      <Separator />

      {/* Notas de historial */}
      <SectionBlock title="NOTAS DE HISTORIAL">
        <ClinicalNotesEditor
          patientId={patientId}
          initialContent={medicalHistory?.clinicalNotes}
          updatedAt={medicalHistory?.clinicalNotesUpdatedAt}
          updatedBy={medicalHistory?.clinicalNotesUpdatedBy}
          readOnly={!canEdit}
          onSave={async (html) => {
            await save(html);
          }}
          saving={saving}
        />
      </SectionBlock>

      <MedicalHistoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveDrawer}
        medicalHistory={medicalHistory}
        loading={drawerLoading}
      />
    </div>
  );
}
