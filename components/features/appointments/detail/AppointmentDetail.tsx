"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Space } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useAppointments } from "@/lib/hooks/appointments";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import type { Appointment } from "@/lib/entity/appointment";
import { AppointmentForm } from "../form/AppointmentForm";
import { isAppointmentActionable } from "@/lib/utils/appointment-utils";

interface AppointmentDetailProps {
  appointmentId: string;
  basePath?: string;
  canEdit?: boolean;
  canCancel?: boolean;
  canComplete?: boolean;
}

export function AppointmentDetail({
  appointmentId,
  basePath = "/appointments",
  canEdit = false,
  canCancel = false,
  canComplete = false,
}: AppointmentDetailProps) {
  const { modal } = App.useApp();
  const router = useRouter();
  const { handleBackToList, handleEditAppointment } = useAppointmentsPage({
    basePath,
  });

  const {
    getAppointmentById,
    cancelAppointment,
    loading,
  } = useAppointments();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  const loadAppointment = useCallback(async () => {
    try {
      setDetailLoading(true);
      const data = await getAppointmentById(appointmentId);
      setAppointment(data);
    } finally {
      setDetailLoading(false);
    }
  }, [appointmentId, getAppointmentById]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const handleCancelAppointment = useCallback(() => {
    if (!appointment) return;

    modal.confirm({
      title: "¿Cancelar cita?",
      content:
        "La cita pasará al estado cancelada y quedará registrada en el historial.",
      okText: "Cancelar cita",
      okType: "danger",
      cancelText: "Volver",
      onOk: async () => {
        await cancelAppointment(appointment.id);
        await loadAppointment();
      },
    });
  }, [modal, appointment, cancelAppointment, loadAppointment]);

  const handleCompleteAppointment = useCallback(() => {
    if (!appointment) return;

    const patientId = appointment.patientId ?? appointment.patient_id;

    if (!patientId) {
      modal.error({
        title: "No se puede finalizar la cita",
        content:
          "La cita no tiene un paciente asociado para abrir el odontograma clínico.",
      });
      return;
    }

    modal.confirm({
      title: "¿Marcar cita como realizada?",
      content:
        "Se abrirá el workspace clínico para guardar el snapshot del odontograma antes de finalizar la cita.",
      okText: "Abrir finalización segura",
      okType: "primary",
      cancelText: "Cancelar",
      onOk: () => {
        const query = new URLSearchParams({
          tab: "workspace",
          appointmentId: appointment.id,
          finalize: "1",
        });

        router.push(`/patients/${patientId}?${query.toString()}`);
      },
    });
  }, [modal, appointment, router]);

  if (detailLoading) {
    return (
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-center">Cargando cita...</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <p className="text-sm text-muted-foreground">No se encontró la cita.</p>
        <Button variant="outline" onClick={handleBackToList}>
          Volver a la lista
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <Space>
          {canEdit && isAppointmentActionable(appointment) && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEditAppointment(appointmentId)}
              size="large"
            >
              Editar
            </Button>
          )}

          {canComplete &&
            appointment.status === "scheduled" &&
            !isAppointmentActionable(appointment) && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleCompleteAppointment}
                size="large"
                disabled={loading}
              >
                Marcar como realizada
              </Button>
            )}

          {canCancel && appointment.status === "scheduled" && (
            <Button
              type="default"
              danger
              icon={<StopOutlined />}
              onClick={handleCancelAppointment}
              size="lg"
              disabled={loading}
            >
              Cancelar cita
            </Button>
          )}

          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToList}
            size="large"
            variant="outline"
          >
            Atrás
          </Button>
        </Space>
      </div>

      <AppointmentForm
        appointmentId={appointmentId}
        basePath={basePath}
        initialData={appointment}
        readOnly
      />
    </>
  );
}
