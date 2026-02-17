"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppointmentDetail } from "@/components/appointments";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AppointmentDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { can, isAdmin } = usePermission();

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

  const canEdit = isAdmin || can("appointments", PermissionAction.EDIT);
  const canCancel = isAdmin || can("appointments", PermissionAction.DELETE);

  return (
    <AppointmentDetail
      appointmentId={id}
      basePath="/appointments"
      canEdit={canEdit}
      canCancel={canCancel}
    />
  );
}
