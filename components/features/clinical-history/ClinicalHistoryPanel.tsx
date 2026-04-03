"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, Spin, Result, Button } from "antd";
import { LockOutlined, ReloadOutlined } from "@ant-design/icons";
import { useClinicalHistory } from "@/lib/hooks/clinical-history";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { ClinicalHistoryHeader } from "./ClinicalHistoryHeader";
import { SummarySection } from "./sections/SummarySection";
import { MedicalHistorySection } from "./sections/MedicalHistorySection";
import { MedicalHistoryDrawer } from "./sections/MedicalHistoryDrawer";
import { TreatmentsSection } from "./sections/TreatmentsSection";
import type { UpdateMedicalHistoryRequest } from "@/lib/entity/clinical-history";

interface ClinicalHistoryPanelProps {
  patientId: string;
  onNavigateToOdontogram: () => void;
}

export function ClinicalHistoryPanel({
  patientId,
  onNavigateToOdontogram,
}: ClinicalHistoryPanelProps) {
  const {
    snapshot,
    loading,
    error,
    forbidden,
    loadSnapshot,
    updateMedicalHistory,
    validateMedicalHistory,
  } = useClinicalHistory();

  const { can, isAdmin } = usePermission();
  const canEditMedicalHistory =
    isAdmin ||
    can("clinical_history", PermissionAction.CREATE) ||
    can("clinical_history", PermissionAction.EDIT);
  const canValidateMedicalHistory =
    isAdmin || can("clinical_history", PermissionAction.EDIT);

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    void loadSnapshot(patientId);
  }, [patientId, loadSnapshot]);

  const handleOpenDrawer = useCallback(() => setDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleSaveMedicalHistory = useCallback(
    async (data: UpdateMedicalHistoryRequest) => {
      await updateMedicalHistory(patientId, data);
      setDrawerOpen(false);
    },
    [patientId, updateMedicalHistory],
  );

  if (loading && !snapshot) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" description="Cargando historia clínica..." />
      </div>
    );
  }

  if (forbidden && !snapshot) {
    return (
      <Result
        status="403"
        title="Acceso denegado"
        subTitle="No tiene permisos para acceder a la historia clínica de este paciente."
        icon={<LockOutlined />}
      />
    );
  }

  if (error && !snapshot) {
    return (
      <Result
        status="error"
        title="Error al cargar historia clínica"
        subTitle={error}
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => loadSnapshot(patientId)}
          >
            Reintentar
          </Button>
        }
      />
    );
  }

  if (!snapshot) {
    return (
      <Result
        status="info"
        title="Sin datos"
        subTitle="No se encontró historia clínica para este paciente."
      />
    );
  }

  const tabItems = [
    {
      key: "summary",
      label: "Resumen",
      children: <SummarySection summary={snapshot.summary} />,
    },
    {
      key: "medical-history",
      label: "Historia médica",
      children: (
        <MedicalHistorySection
          medicalHistory={snapshot.medicalHistory}
          canEdit={canEditMedicalHistory}
          onEdit={handleOpenDrawer}
          canValidate={canValidateMedicalHistory}
          onValidate={() => validateMedicalHistory(patientId)}
          validating={loading}
        />
      ),
    },
    {
      key: "treatments",
      label: "Tratamientos y planes",
      children: (
        <TreatmentsSection
          treatments={snapshot.treatments}
          treatmentPlans={snapshot.treatmentPlans}
          onNavigateToOdontogram={onNavigateToOdontogram}
        />
      ),
    },
  ];

  return (
    <div>
      {snapshot.patientHeader && (
        <ClinicalHistoryHeader patientHeader={snapshot.patientHeader} />
      )}

      <Tabs defaultActiveKey="summary" items={tabItems} />

      <MedicalHistoryDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onSave={handleSaveMedicalHistory}
        medicalHistory={snapshot.medicalHistory}
        loading={loading}
      />
    </div>
  );
}
