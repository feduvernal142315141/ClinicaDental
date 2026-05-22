/** @deprecated Use MedicalHistoryDrawer via ClinicalHistoryPage instead */
"use client";

import { Form, Button, Space, Alert } from "antd";
import { SaveOutlined, CloseOutlined } from "@ant-design/icons";
import type {
  ClinicalHistoryMedicalHistory,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";
import { MedicalHistoryFormFields } from "@/components/features/clinical-history/sections/MedicalHistoryFormFields";
import { useAntecedentesPanel } from "@/lib/hooks/patients/clinical-history-page/use-antecedentes-panel";

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
  patientId: _patientId,
  medicalHistory,
  onSave,
  onClose,
  onSaved,
}: AntecedentesPanelProps) {
  const {
    form,
    saving,
    error,
    panelTitle,
    handleFinish,
    handleClose,
    handleSubmit,
  } = useAntecedentesPanel({
    open,
    medicalHistory,
    onSave,
    onClose,
    onSaved,
  });

  if (!open) return null;

  return (
    <div className="flex flex-col h-full min-w-95 bg-white border-l border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-foreground">{panelTitle}</h3>
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
          <Alert type="error" title={error} showIcon className="mb-4" />
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
            onClick={handleSubmit}
          >
            Guardar
          </Button>
        </Space>
      </div>
    </div>
  );
}
