"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "antd";
import { SectionTitle } from "@/components/ui/antd";
import { AppointmentsSchedulerShell } from "@/components/features/appointments/scheduler/AppointmentsSchedulerShell";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

const NOTICE_MESSAGES: Record<string, string> = {
  detail_unavailable:
    "El detalle de citas por ID no está disponible actualmente con los endpoints activos.",
  edit_unavailable:
    "La edición de citas por ID no está disponible actualmente con los endpoints activos.",
};

export default function AppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, isAdmin } = usePermission();
  const {
    handleNewAppointment,
    handleNewAppointmentPrefilled,
    handleViewAppointment,
  } = useAppointmentsPage({
    basePath: "/appointments",
  });

  useEffect(() => {
    const allowed =
      isAdmin ||
      can("appointments", PermissionAction.CREATE) ||
      can("appointments", PermissionAction.EDIT) ||
      can("appointments", PermissionAction.DELETE) ||
      can("appointments", PermissionAction.BLOCK);

    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  const canCreate = isAdmin || can("appointments", PermissionAction.CREATE);

  const noticeMessage = useMemo(() => {
    const notice = searchParams.get("notice") ?? "";
    return NOTICE_MESSAGES[notice] ?? null;
  }, [searchParams]);

  return (
    <>
      <SectionTitle
        title="Gestión de Citas"
        subtitle="Agenda de citas por especialista"
      />

      {noticeMessage && (
        <Alert type="warning" showIcon title={noticeMessage} className="mb-6" />
      )}

      <AppointmentsSchedulerShell
        canCreate={canCreate}
        onNewAppointment={handleNewAppointment}
        onNewAppointmentPrefilled={handleNewAppointmentPrefilled}
        onViewDetail={handleViewAppointment}
      />
    </>
  );
}
