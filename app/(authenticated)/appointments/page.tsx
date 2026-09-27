"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/layout/page-header";
import { Modal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { notify } from "@/lib/utils/notify";
import { AppointmentsSchedulerShell } from "@/components/features/appointments/scheduler/AppointmentsSchedulerShell";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import type { Appointment } from "@/lib/entity/appointment";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function AppointmentsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { can, isAdmin } = usePermission();
  const {
    handleNewAppointment,
    handleNewAppointmentPrefilled,
    handleViewAppointment,
    handleEditAppointment,
    handleStartConsultation: navigateToConsultation,
  } = useAppointmentsPage({
    basePath: "/appointments",
  });

  const [pendingAppointment, setPendingAppointment] = useState<Appointment | null>(null);
  const [startLoading, setStartLoading] = useState(false);

  const todayISO = new Date().toLocaleDateString("sv"); // YYYY-MM-DD en timezone local

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

  const doStartAndNavigate = async (appointment: Appointment) => {
    if (startLoading) return;
    setStartLoading(true);
    try {
      const result = await appointmentsService.startAppointment(appointment.id);
      if (result?.appointmentAdjusted) {
        sessionStorage.setItem("appointmentAdjusted", "true");
      }
      navigateToConsultation(appointment);
    } catch (e) {
      notify.error((e as Error).message || "No se pudo iniciar la cita", {
        description:
          "No fue posible iniciar la consulta. Revisa tu conexión e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
      });
    } finally {
      setStartLoading(false);
      setPendingAppointment(null);
    }
  };

  const handleStartConsultation = (appointment: Appointment) => {
    if (appointment.status === "in_progress") {
      navigateToConsultation(appointment);
      return;
    }
    if (appointment.date > todayISO) {
      setPendingAppointment(appointment);
    } else {
      void doStartAndNavigate(appointment);
    }
  };

  return (
    <>
      <PageHeader
        title={t("appointments.page.title")}
        subtitle={t("appointments.page.description")}
      />

      <AppointmentsSchedulerShell
        canCreate={canCreate}
        onNewAppointment={handleNewAppointment}
        onNewAppointmentPrefilled={handleNewAppointmentPrefilled}
        onViewDetail={handleViewAppointment}
        onEditAppointment={handleEditAppointment}
        onStartConsultation={handleStartConsultation}
        startConsultationLoading={startLoading}
      />

      <Modal
        open={!!pendingAppointment}
        onOpenChange={(next) => {
          if (!next && !startLoading) setPendingAppointment(null);
        }}
        icon={<PlayCircle className="h-5 w-5" />}
        title="Iniciar consulta"
        className="w-full sm:max-w-lg"
        footer={
          pendingAppointment ? (
            <>
              <Button
                variant="outline"
                type="button"
                onClick={() => setPendingAppointment(null)}
                disabled={startLoading}
              >
                No, cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void doStartAndNavigate(pendingAppointment)}
                loading={startLoading}
              >
                Sí, iniciar consulta
              </Button>
            </>
          ) : undefined
        }
      >
        {pendingAppointment && (
          <div className="px-6 pb-5">
            <p className="text-sm text-subtle">
              Esta cita está programada para el{" "}
              <strong className="font-semibold text-ink">
                {pendingAppointment.date}
              </strong>
              . ¿Deseas iniciarla ahora de todas formas?
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
