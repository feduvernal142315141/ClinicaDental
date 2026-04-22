"use client";

import { useState } from "react";
import { Tag, Badge, Input, Button as AntButton } from "antd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Edit } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { MedicalHistoryDrawer } from "@/components/features/clinical-history/sections/MedicalHistoryDrawer";
import type {
  ClinicalHistoryMedicalHistory,
  ClinicalHistoryPatientHeader,
  AlertSeverity,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";
import { ALERT_SEVERITY_COLORS } from "@/lib/entity/clinical-history";

const { TextArea } = Input;

const SEVERITY_BADGE_STATUS: Record<AlertSeverity, "error" | "warning" | "processing"> = {
  critical: "error",
  warning: "warning",
  info: "processing",
};

interface MedicalAntecedentsColumnProps {
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  patientHeader: ClinicalHistoryPatientHeader | null;
  patientId: string;
  onMedicalHistoryUpdated?: () => void;
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
  patientId: _patientId,
  onMedicalHistoryUpdated,
}: MedicalAntecedentsColumnProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [notes, setNotes] = useState("");

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
    <div className="flex flex-col gap-4 h-full overflow-auto">
      {/* Alertas */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <Badge
                key={alert.id}
                status={SEVERITY_BADGE_STATUS[alert.severity]}
                color={ALERT_SEVERITY_COLORS[alert.severity]}
                text={alert.message}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Antecedentes médicos */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Antecedentes médicos</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="h-7 text-xs"
            >
              <Edit className="mr-1 h-3 w-3" />
              Editar antecedentes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
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
        </CardContent>
      </Card>

      {/* Notas clínicas */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Notas clínicas</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <TextArea
            rows={5}
            placeholder="Escribir notas clínicas..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <AntButton
            type="primary"
            size="small"
            onClick={() => console.log("TODO: HU-CLIN-003", notes)}
          >
            Guardar
          </AntButton>
        </CardContent>
      </Card>

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
