"use client";

import { use } from "react";
import { AppointmentDetail } from "@/components/features/appointments/detail/AppointmentDetail";
import { SectionTitle } from "@/components/ui/antd";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AppointmentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { can, isAdmin } = usePermission();

  const canEdit = isAdmin || can("appointments", PermissionAction.EDIT);
  const canCancel = isAdmin || can("appointments", PermissionAction.DELETE);

  return (
    <>
      <SectionTitle
        title="Detalle de Cita"
        subtitle="Información completa de la cita"
      />
      <AppointmentDetail
        appointmentId={id}
        basePath="/appointments"
        canEdit={canEdit}
        canCancel={canCancel}
      />
    </>
  );
}
