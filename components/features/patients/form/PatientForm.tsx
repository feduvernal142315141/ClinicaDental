"use client";

import { forwardRef, useImperativeHandle } from "react";
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
  /** Callback on successful submit (overrides router navigation) */
  onSuccess?: () => void;
  /** Callback on cancel (overrides router navigation) */
  onCancel?: () => void;
  /** Compact mode: disables maxHeight on Card body */
  compact?: boolean;
  /** Hide internal action buttons (used when parent provides its own actions) */
  hideActions?: boolean;
  /** Callback when loading state changes */
  onLoadingChange?: (loading: boolean) => void;
}

export interface PatientFormRef {
  submit: () => void;
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
export const PatientForm = forwardRef<PatientFormRef, PatientFormProps>(
  function PatientForm(
    {
      patientId,
      basePath = "/patients",
      initialData,
      readOnly = false,
      onSuccess,
      onCancel,
      compact = false,
      hideActions = false,
      onLoadingChange,
    },
    ref
  ) {
    const { form, isEdit, loading, handleSubmit, handleCancel } =
      usePatientForm({
        patientId,
        basePath,
        initialData,
        onSuccess,
        onCancel,
        onLoadingChange,
      });

    useImperativeHandle(ref, () => ({
      submit: () => form.submit(),
    }));

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
              ...(compact ? {} : { maxHeight: "calc(100vh - 320px)" }),
              overflowY: "auto",
              overflowX: "hidden",
            },
          }}
          actions={
            readOnly || hideActions
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
);
