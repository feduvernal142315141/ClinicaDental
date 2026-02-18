"use client";

import { useCallback, useState } from "react";
import {
  Form,
  Row,
  Col,
  DatePicker,
  Select,
  Input,
  Flex,
  Alert,
  Button,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { PlusOutlined } from "@ant-design/icons";
import { Card } from "@/components/ui/antd";
import { FormTimePicker } from "@/components/ui/antd/forms/FormTimePicker";
import { Modal as CustomModal } from "@/components/ui/primitives/custom";
import { FormActions } from "@/components/features/doctors/form/components/FormActions";
import { PatientFormFields } from "@/components/features/patients/form/PatientFormFields";
import { useAppointmentForm } from "@/lib/hooks/appointments";
import type { AppointmentFormPrefill } from "@/lib/hooks/appointments/use-appointment-form";
import type { Appointment } from "@/lib/entity/appointment";

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "60 minutos" },
];

const TYPE_OPTIONS = [
  { value: "consultation", label: "Consulta" },
  { value: "control", label: "Control" },
  { value: "emergency", label: "Emergencia" },
  { value: "follow-up", label: "Seguimiento" },
  { value: "routine", label: "Rutina" },
];

interface AppointmentFormProps {
  appointmentId?: string;
  basePath?: string;
  initialData?: Appointment;
  prefill?: AppointmentFormPrefill;
  readOnly?: boolean;
}

type QuickPatientFormValues = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "M" | "F";
  address?: string;
  agreement?: boolean;
};

export function AppointmentForm({
  appointmentId,
  basePath = "/appointments",
  initialData,
  prefill,
  readOnly = false,
}: AppointmentFormProps) {
  const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] =
    useState(false);
  const [quickPatientForm] = Form.useForm<QuickPatientFormValues>();

  const {
    form,
    isEdit,
    loading,
    patientCreationLoading,
    catalogsLoading,
    availabilityLoading,
    patientsOptions,
    doctorsOptions,
    availableTimes,
    handleSubmit,
    handleCancel,
    createQuickPatient,
  } = useAppointmentForm({
    appointmentId,
    basePath,
    initialData,
    prefill,
  });

  const disabledTime = useCallback(() => {
    if (!availableTimes.length) return {};

    const availableHours = new Set<number>();
    const availableMinutesByHour = new Map<number, Set<number>>();

    for (const t of availableTimes) {
      const [h, m] = t.split(":").map(Number);
      availableHours.add(h);
      if (!availableMinutesByHour.has(h))
        availableMinutesByHour.set(h, new Set());
      availableMinutesByHour.get(h)!.add(m);
    }

    const allHours = Array.from({ length: 24 }, (_, i) => i);
    const disabledHours = () => allHours.filter((h) => !availableHours.has(h));

    const disabledMinutes = (selectedHour: number) => {
      const allowed = availableMinutesByHour.get(selectedHour);
      if (!allowed) return Array.from({ length: 60 }, (_, i) => i);
      return Array.from({ length: 60 }, (_, i) => i).filter(
        (m) => !allowed.has(m),
      );
    };

    return { disabledHours, disabledMinutes };
  }, [availableTimes]);

  const openCreatePatientModal = useCallback(() => {
    setIsCreatePatientModalOpen(true);
  }, []);

  const closeCreatePatientModal = useCallback(() => {
    setIsCreatePatientModalOpen(false);
    quickPatientForm.resetFields();
  }, [quickPatientForm]);

  const handleCreatePatientSubmit = useCallback(async () => {
    try {
      const values = await quickPatientForm.validateFields();
      const createdId = await createQuickPatient(values);
      if (createdId) {
        closeCreatePatientModal();
      }
    } catch {
      // AntD handles validation errors and patient hook handles API errors.
    }
  }, [closeCreatePatientModal, createQuickPatient, quickPatientForm]);

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={loading || patientCreationLoading || readOnly}
        initialValues={{
          duration: 30,
          type: "consultation",
        }}
      >
        <Card
          title="Información de la Cita"
          styles={{
            body: {
              maxHeight: "calc(100vh - 320px)",
              overflowY: "auto",
              overflowX: "hidden",
            },
          }}
          actions={
            readOnly
              ? undefined
              : [
                  <Flex
                    key="actions"
                    justify="end"
                    style={{ padding: "0 16px" }}
                  >
                    <FormActions
                      loading={loading || patientCreationLoading}
                      onCancel={handleCancel}
                      submitText={isEdit ? "Actualizar" : "Guardar"}
                    />
                  </Flex>,
                ]
          }
        >
          {(catalogsLoading || availabilityLoading) && (
            <Alert
              type="info"
              showIcon
              message="Cargando información para el formulario..."
              className="mb-4"
            />
          )}

          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Form.Item label="Paciente" required style={{ marginBottom: 0 }}>
                <Flex align="center" gap={8}>
                  <Form.Item
                    name="patientId"
                    rules={[
                      { required: true, message: "El paciente es obligatorio" },
                    ]}
                    style={{ marginBottom: 0, flex: 1, minWidth: 0 }}
                  >
                    <Select
                      placeholder="Seleccione paciente"
                      size="large"
                      loading={catalogsLoading}
                      options={patientsOptions.map((option) => ({
                        value: option.id,
                        label: option.label,
                      }))}
                    />
                  </Form.Item>
                  {!readOnly && (
                    <Tooltip title="Nuevo paciente">
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        aria-label="Nuevo paciente"
                        onClick={openCreatePatientModal}
                        disabled={
                          loading || catalogsLoading || patientCreationLoading
                        }
                      />
                    </Tooltip>
                  )}
                </Flex>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="doctorId"
                label="Doctor"
                rules={[
                  { required: true, message: "El doctor es obligatorio" },
                ]}
              >
                <Select
                  placeholder="Seleccione doctor"
                  size="large"
                  loading={catalogsLoading}
                  options={doctorsOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="date"
                label="Fecha"
                rules={[{ required: true, message: "La fecha es obligatoria" }]}
                getValueProps={(value) => ({
                  value: value ? dayjs(value) : undefined,
                })}
                getValueFromEvent={(date) => date?.format("YYYY-MM-DD")}
              >
                <DatePicker
                  placeholder="Seleccione fecha"
                  size="large"
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <FormTimePicker
                name="time"
                label="Hora"
                required
                placeholder="Seleccione hora"
                loading={availabilityLoading}
                disabledTime={disabledTime}
                hideDisabledOptions
              />
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="duration"
                label="Duración"
                rules={[
                  { required: true, message: "La duración es obligatoria" },
                ]}
              >
                <Select
                  placeholder="Seleccione duración"
                  size="large"
                  options={DURATION_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="type"
                label="Tipo de Cita"
                rules={[{ required: true, message: "El tipo es obligatorio" }]}
              >
                <Select
                  placeholder="Seleccione tipo"
                  size="large"
                  options={TYPE_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="reason" label="Motivo">
                <Input placeholder="Motivo de la cita" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="notes" label="Notas">
                <Input.TextArea rows={4} placeholder="Notas adicionales" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>

      <CustomModal
        open={isCreatePatientModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreatePatientModal();
            return;
          }

          setIsCreatePatientModalOpen(true);
        }}
        title="Registrar nuevo paciente"
        description="Completa los datos para crear y seleccionar el paciente en esta cita."
        className="w-full sm:max-w-2xl"
      >
        <Form
          form={quickPatientForm}
          layout="vertical"
          initialValues={{
            agreement: true,
          }}
        >
          <PatientFormFields gutter={[16, 12]} />

          <Flex justify="end" gap={8}>
            <Button onClick={closeCreatePatientModal}>Cancelar</Button>
            <Button
              type="primary"
              onClick={handleCreatePatientSubmit}
              loading={patientCreationLoading}
            >
              Guardar paciente
            </Button>
          </Flex>
        </Form>
      </CustomModal>
    </>
  );
}
