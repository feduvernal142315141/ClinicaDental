"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Col, DatePicker, Row, Select } from "antd";
import dayjs from "dayjs";
import { SectionTitle, Card } from "@/components/ui/antd";
import {
  AppointmentCalendar,
  DoctorAppointmentsTimeline,
} from "@/components/appointments";
import {
  useAppointmentAvailability,
  useAppointmentsPage,
  useDoctorAppointments,
} from "@/lib/hooks/appointments";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import type { Appointment } from "@/lib/entity/appointment";

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
];

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
  const { handleNewAppointment, handleNewAppointmentPrefilled } =
    useAppointmentsPage({
      basePath: "/appointments",
    });

  const {
    selectedDoctorId,
    selectedDate,
    selectedInterval,
    doctorsOptions,
    doctorsLoading,
    availabilityLoading,
    slots,
    disabledDate,
    setSelectedDoctorId,
    setSelectedDate,
    setSelectedInterval,
    scheduleSlot,
  } = useAppointmentAvailability({
    basePath: "/appointments",
    defaultInterval: 15,
  });

  const {
    appointments: doctorAppointments,
    loading: appointmentsLoading,
    cancelAppointment,
  } = useDoctorAppointments({
    doctorId: selectedDoctorId,
    date: selectedDate,
  });

  const selectedDoctorName = useMemo(
    () => doctorsOptions.find((d) => d.id === selectedDoctorId)?.name,
    [doctorsOptions, selectedDoctorId],
  );

  const handleReschedule = useCallback(
    (appointment: Appointment) => {
      handleNewAppointmentPrefilled({
        doctorId: appointment.doctorId ?? "",
        patientId: appointment.patientId ?? appointment.patient_id ?? "",
        date: appointment.date,
        time: appointment.time,
      });
    },
    [handleNewAppointmentPrefilled],
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

  const noticeMessage = useMemo(() => {
    const notice = searchParams.get("notice") ?? "";
    return NOTICE_MESSAGES[notice] ?? null;
  }, [searchParams]);

  return (
    <>
      <SectionTitle
        title="Gestión de Citas"
        subtitle="Explore horarios disponibles y agende nuevas citas"
        actionButton={
          canCreate
            ? {
                label: "Nueva Cita",
                onClick: handleNewAppointment,
              }
            : undefined
        }
      />

      {noticeMessage && (
        <Alert type="warning" showIcon title={noticeMessage} className="mb-6" />
      )}

      <Card title="Filtros de Disponibilidad" className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={10}>
            <Select
              placeholder="Seleccione doctor"
              size="large"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              loading={doctorsLoading}
              value={selectedDoctorId || undefined}
              onChange={(value) => setSelectedDoctorId(value ?? "")}
              options={doctorsOptions.map((doctor) => ({
                value: doctor.id,
                label: doctor.label,
              }))}
            />
          </Col>

          <Col xs={24} md={12} xl={8}>
            <DatePicker
              size="large"
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              value={dayjs(selectedDate, "YYYY-MM-DD")}
              disabledDate={disabledDate}
              onChange={(value) => {
                setSelectedDate(
                  value?.format("YYYY-MM-DD") ?? dayjs().format("YYYY-MM-DD"),
                );
              }}
            />
          </Col>

          <Col xs={24} md={12} xl={6}>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={selectedInterval}
              onChange={(value) => setSelectedInterval(value)}
              options={INTERVAL_OPTIONS}
            />
          </Col>
        </Row>
      </Card>

      <Row className="mt-6" gutter={[24, 24]}>
        <Col xs={24} xl={12}>
          <AppointmentCalendar
            slots={slots}
            loading={availabilityLoading}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onScheduleSlot={canCreate ? scheduleSlot : undefined}
            disabledDate={disabledDate}
          />
        </Col>
        <Col xs={24} xl={12}>
          <DoctorAppointmentsTimeline
            appointments={doctorAppointments}
            loading={appointmentsLoading}
            selectedDate={selectedDate}
            doctorName={selectedDoctorName}
            onCancel={canCreate ? cancelAppointment : undefined}
            onReschedule={canCreate ? handleReschedule : undefined}
          />
        </Col>
      </Row>
    </>
  );
}
