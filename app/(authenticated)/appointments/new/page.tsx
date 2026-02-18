"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionTitle } from "@/components/ui/antd";
import { AppointmentForm } from "@/components/appointments";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import type { AppointmentFormPrefill } from "@/lib/hooks/appointments/use-appointment-form";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, isAdmin } = usePermission();
  const { handleBackToList } = useAppointmentsPage({ basePath: "/appointments" });

  const prefill = useMemo<AppointmentFormPrefill | undefined>(() => {
    const doctorId = searchParams.get("doctorId") ?? undefined;
    const patientId = searchParams.get("patientId") ?? undefined;
    const date = searchParams.get("date") ?? undefined;
    const time = searchParams.get("time") ?? undefined;
    const intervalRaw = searchParams.get("interval");
    const interval = intervalRaw ? Number(intervalRaw) : undefined;

    if (!doctorId && !patientId && !date && !time && interval === undefined) {
      return undefined;
    }

    return {
      doctorId,
      patientId,
      date,
      time,
      interval: Number.isFinite(interval) ? interval : undefined,
    };
  }, [searchParams]);

  useEffect(() => {
    const allowed = isAdmin || can("appointments", PermissionAction.CREATE);

    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [can, isAdmin, router]);

  return (
    <>
      <SectionTitle
        title="Nueva Cita"
        subtitle="Programe una nueva cita en el sistema"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
          type: "default",
        }}
      />

      <AppointmentForm basePath="/appointments" prefill={prefill} />
    </>
  );
}
