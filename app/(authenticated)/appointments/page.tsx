"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button } from "antd";
import { CloseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { SectionTitle } from "@/components/ui/antd";
import { AppointmentsSchedulerShell } from "@/components/features/appointments/scheduler/AppointmentsSchedulerShell";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import type { Appointment } from "@/lib/entity/appointment";

export default function AppointmentsPage() {
  const router = useRouter();
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
      toast.error((e as Error).message || "No se pudo iniciar la cita");
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
      <SectionTitle
        title="Gestión de Citas"
        subtitle="Agenda de citas por especialista"
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
        title="Iniciar consulta"
        open={!!pendingAppointment}
        onCancel={() => !startLoading && setPendingAppointment(null)}
        footer={null}
        mask={{ closable: !startLoading }}
        destroyOnHidden
      >
        {pendingAppointment && (
          <>
            <p className="mb-4">
              Esta cita está programada para el{" "}
              <strong>{pendingAppointment.date}</strong>. ¿Deseas iniciarla ahora de todas formas?
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="default"
                danger
                icon={<CloseCircleOutlined />}
                style={{ flex: 1 }}
                onClick={() => setPendingAppointment(null)}
                disabled={startLoading}
              >
                No, cancelar
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                style={{ flex: 1 }}
                loading={startLoading}
                onClick={() => void doStartAndNavigate(pendingAppointment)}
              >
                Sí, iniciar consulta
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
