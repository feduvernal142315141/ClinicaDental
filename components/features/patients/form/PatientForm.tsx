"use client";

import { Form, Flex } from "antd";
import { usePatientForm } from "@/lib/hooks/patients";
import { Card } from "@/components/ui/antd";
import { FormActions } from "@/components/features/doctors/form/components/FormActions";
import { PatientFormFields } from "./PatientFormFields";
import type { Patient } from "@/lib/entity/patients";

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
        <PatientFormFields />
      </Card>
    </Form>
  );
}
