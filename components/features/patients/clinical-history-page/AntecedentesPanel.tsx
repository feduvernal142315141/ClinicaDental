/** @deprecated Use MedicalHistoryDrawer via ClinicalHistoryPage instead */
"use client";

import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Modal,
  Space,
  Alert,
} from "antd";
import { SaveOutlined, CloseOutlined } from "@ant-design/icons";
import type {
  ClinicalHistoryMedicalHistory,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";
import dayjs from "dayjs";
import { MedicalHistoryFormFields } from "@/components/features/clinical-history/sections/MedicalHistoryFormFields";

export interface AntecedentesPanelProps {
  open: boolean;
  patientId: string;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  onSave: (data: UpdateMedicalHistoryRequest) => Promise<void>;
  onClose: () => void;
  onSaved: () => void;
}

export function AntecedentesPanel({
  open,
  medicalHistory,
  onSave,
  onClose,
  onSaved,
}: AntecedentesPanelProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (medicalHistory) {
        form.setFieldsValue({
          ...medicalHistory,
          lastDentalVisit: medicalHistory.lastDentalVisit
            ? dayjs(medicalHistory.lastDentalVisit)
            : undefined,
          painLocation: medicalHistory.currentPain?.location,
          painIntensity: medicalHistory.currentPain?.intensity ?? 0,
          painType: medicalHistory.currentPain?.type,
          painDuration: medicalHistory.currentPain?.duration,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, medicalHistory, form]);

  const handleFinish = async (values: Record<string, unknown>) => {
    const rawIntensity = values.painIntensity as number | undefined;
    const intensity = rawIntensity && rawIntensity > 0 ? rawIntensity : null;

    const hasPainData =
      intensity !== null ||
      (values.painLocation as string)?.trim() ||
      values.painType ||
      (values.painDuration as string)?.trim();

    const data: UpdateMedicalHistoryRequest = {
      occupation: values.occupation as string,
      maritalStatus: values.maritalStatus as string,
      systemicDiseases: (values.systemicDiseases as string[]) ?? [],
      currentMedications: (values.currentMedications as string[]) ?? [],
      allergies: (values.allergies as string[]) ?? [],
      previousSurgeries: (values.previousSurgeries as string[]) ?? [],
      chiefComplaint: values.chiefComplaint as string,
      habits: (values.habits as string[]) ?? [],
      currentPain: hasPainData
        ? {
            location: values.painLocation as string,
            intensity: intensity ?? undefined,
            type: values.painType as string,
            duration: values.painDuration as string,
          }
        : undefined,
      lastDentalVisit: values.lastDentalVisit
        ? (values.lastDentalVisit as { format: (s: string) => string }).format("YYYY-MM-DD")
        : undefined,
    };

    setSaving(true);
    setError(null);
    try {
      await onSave(data);
      onSaved();
    } catch {
      setError("Error al guardar. Por favor, inténtelo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    const touched = form.isFieldsTouched();
    if (touched) {
      Modal.confirm({
        title: "¿Descartar cambios?",
        content: "Hay cambios sin guardar. ¿Desea cerrar de todos modos?",
        okText: "Sí, cerrar",
        cancelText: "Continuar editando",
        okButtonProps: { danger: true },
        onOk: onClose,
      });
    } else {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="flex flex-col h-full min-w-[380px] bg-white border-l border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-foreground">
          {medicalHistory ? "Editar Antecedentes" : "Crear Antecedentes"}
        </h3>
        <Button
          type="text"
          icon={<CloseOutlined />}
          size="small"
          onClick={handleClose}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            className="mb-4"
          />
        )}

          <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
          size="small"
        >
          <MedicalHistoryFormFields compact />
        </Form>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <Space className="w-full justify-end">
          <Button
            type="default"
            danger
            icon={<CloseOutlined />}
            onClick={handleClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => form.submit()}
          >
            Guardar
          </Button>
        </Space>
      </div>
    </div>
  );
}
