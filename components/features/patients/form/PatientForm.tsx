"use client";

import { Form, Input, Row, Col, Flex, Select, DatePicker, Switch } from "antd";
import { usePatientForm } from "@/lib/hooks/patients";
import { genderOptions } from "@/lib/entity/patients";
import { Card } from "@/components/ui/antd";
import { FormActions } from "@/components/features/doctors/form/components/FormActions";
import type { Patient } from "@/lib/entity/patients";
import dayjs from "dayjs";

interface PatientFormProps {
  /** Patient ID for editing (undefined for new patient) */
  patientId?: string;
  /** Base path for navigation */
  basePath?: string;
  /** Initial data (for editing) */
  initialData?: Patient;
  /** Read-only mode (for detail view) */
  readOnly?: boolean;
}

/**
 * Patient Form Component
 *
 * Handles creation, editing, and viewing of patients.
 * Uses Ant Design Form with validation.
 *
 * @example
 * // New patient
 * <PatientForm basePath="/patients" />
 *
 * // Edit patient
 * <PatientForm patientId="123" basePath="/patients" />
 */
export function PatientForm({
  patientId,
  basePath = "/patients",
  initialData,
  readOnly = false,
}: PatientFormProps) {
  const { form, isEdit, loading, handleSubmit, handleCancel } = usePatientForm({
    patientId,
    basePath,
    initialData,
  });

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        agreement: true,
      }}
      disabled={loading || readOnly}
    >
      <Card
        title="Información del Paciente"
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
                <Flex key="actions" justify="end" style={{ padding: "0 16px" }}>
                  <FormActions
                    loading={loading}
                    onCancel={handleCancel}
                    submitText={isEdit ? "Actualizar" : "Guardar"}
                  />
                </Flex>,
              ]
        }
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Nombre Completo"
              rules={[
                { required: true, message: "El nombre es obligatorio" },
                {
                  min: 2,
                  message: "El nombre debe tener al menos 2 caracteres",
                },
              ]}
            >
              <Input placeholder="Ej: María González López" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Correo Electrónico"
              rules={[
                { required: true, message: "El correo es obligatorio" },
                { type: "email", message: "Ingrese un correo válido" },
              ]}
            >
              <Input placeholder="Ej: maria@email.com" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="Teléfono"
              rules={[
                { required: true, message: "El teléfono es obligatorio" },
              ]}
            >
              <Input placeholder="Ej: +505 8275-8275" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="dateOfBirth"
              label="Fecha de Nacimiento"
              rules={[
                {
                  required: true,
                  message: "La fecha de nacimiento es obligatoria",
                },
              ]}
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
            <Form.Item
              name="gender"
              label="Género"
              rules={[{ required: true, message: "El género es obligatorio" }]}
            >
              <Select
                placeholder="Seleccione género"
                size="large"
                options={genderOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="address" label="Dirección">
              <Input placeholder="Ej: Calle Mayor 123, Madrid" size="large" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="agreement"
              label="Convenio"
              valuePropName="checked"
            >
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Form>
  );
}
