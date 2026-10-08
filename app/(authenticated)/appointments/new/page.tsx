"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/layout/page-header";
import { AppointmentForm } from "@/components/appointments";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import type { AppointmentFormPrefill } from "@/lib/hooks/appointments/use-appointment-form";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, isAdmin } = usePermission();
  const { t } = useI18n();
  const { handleBackToList } = useAppointmentsPage({
    basePath: "/appointments",
  });

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
      <PageHeader
        title={t("appointments.page.newTitle")}
        subtitle={t("appointments.page.newDescription")}
        actionButton={{
          label: t("patients.actions.back"),
          onClick: handleBackToList,
          variant: "back",
        }}
      />

      <AppointmentForm basePath="/appointments" prefill={prefill} />
    </>
  );
}
