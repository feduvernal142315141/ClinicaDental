"use client";

import { useMemo } from "react";
import { App } from "antd";
import { OdontogramModule, createApiOdontogramAdapter } from "@/lib/odontogram";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useAuth } from "@/lib/contexts/auth-context";

interface PatientOdontogramPanelProps {
  patient: {
    id: string;
    clinicId?: string;
    clinic_id?: string;
  };
  activeAppointmentId?: string;
}

export function PatientOdontogramPanel({
  patient,
  activeAppointmentId,
}: PatientOdontogramPanelProps) {
  const { message } = App.useApp();
  const { can, isAdmin } = usePermission();
  const { user } = useAuth();

  const clinicId = patient.clinicId ?? patient.clinic_id ?? "";

  const adapter = useMemo(
    () =>
      createApiOdontogramAdapter({
        authorId: user?.id ?? "",
        clinicId,
        visitId: activeAppointmentId,
      }),
    [user?.id, clinicId, activeAppointmentId],
  );

  const readOnly = !(isAdmin || can("patients", PermissionAction.EDIT));

  return (
    <OdontogramModule
      patientId={patient.id}
      clinicId={clinicId}
      adapter={adapter}
      readOnly={readOnly}
      showHeader={false}
      initialTab="odontogram"
      onError={() => {
        message.error("No se pudo sincronizar el odontograma del paciente");
      }}
    />
  );
}
