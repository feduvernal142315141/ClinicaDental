"use client";

import { useMemo } from "react";
import { App } from "antd";
import {
  OdontogramModule,
  createLocalStorageOdontogramAdapter,
} from "@/lib/odontogram";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

interface PatientOdontogramPanelProps {
  patient: {
    id: string;
    clinicId?: string;
    clinic_id?: string;
  };
}

export function PatientOdontogramPanel({
  patient,
}: PatientOdontogramPanelProps) {
  const { message } = App.useApp();
  const { can, isAdmin } = usePermission();

  const adapter = useMemo(
    () =>
      createLocalStorageOdontogramAdapter({
        namespace: "front-clinic-odontogram",
      }),
    [],
  );

  const clinicId = patient.clinicId ?? patient.clinic_id;
  const readOnly = !(isAdmin || can("patients", PermissionAction.EDIT));

  return (
    <OdontogramModule
      patientId={patient.id}
      clinicId={clinicId}
      adapter={adapter}
      readOnly={readOnly}
      initialTab="odontogram"
      onError={() => {
        message.error("No se pudo sincronizar el odontograma del paciente");
      }}
    />
  );
}
