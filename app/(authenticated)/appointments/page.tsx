"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Row, Col } from "antd";
import { SectionTitle } from "@/components/ui/antd";
import {
  AppointmentsList,
  AppointmentCalendar,
} from "@/components/appointments";
import { useAppointmentsPage } from "@/lib/hooks/appointments";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import type { Appointment } from "@/lib/entity/appointment";

export default function AppointmentsPage() {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const { handleNewAppointment, handleViewAppointment } = useAppointmentsPage({
    basePath: "/appointments",
  });

  const [calendarAppointments, setCalendarAppointments] = useState<
    Appointment[]
  >([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const handleDataLoaded = useCallback(
    (appointments: Appointment[], loading: boolean) => {
      setCalendarAppointments(appointments);
      setCalendarLoading(loading);
    },
    [],
  );

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
  const canEdit = isAdmin || can("appointments", PermissionAction.EDIT);
  const canCancel = isAdmin || can("appointments", PermissionAction.DELETE);

  return (
    <>
      <SectionTitle
        title="Gestión de Citas"
        subtitle="Administre las citas del sistema"
        actionButton={
          canCreate
            ? {
                label: "Nueva Cita",
                onClick: handleNewAppointment,
              }
            : undefined
        }
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={16}>
          <AppointmentsList
            basePath="/appointments"
            canEdit={canEdit}
            canCancel={canCancel}
            onDataLoaded={handleDataLoaded}
          />
        </Col>
        <Col xs={24} xl={8}>
          <AppointmentCalendar
            appointments={calendarAppointments}
            loading={calendarLoading}
            onViewAppointment={handleViewAppointment}
          />
        </Col>
      </Row>
    </>
  );
}
