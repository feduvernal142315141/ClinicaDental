"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SectionTitle } from "@/components/ui/antd";
import { AppointmentForm } from "@/components/appointments";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAppointmentPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const { handleBackToList } = useAppointmentsPage({ basePath: "/appointments" });

  useEffect(() => {
    const allowed = isAdmin || can("appointments", PermissionAction.EDIT);
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  return (
    <>
      <SectionTitle
        title="Editar Cita"
        subtitle="Actualice la información de la cita"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
          type: "default",
        }}
      />

      <AppointmentForm appointmentId={id} basePath="/appointments" />
    </>
  );
}
