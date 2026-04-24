"use client";

import { useEffect } from "react";
import { Drawer, Form, Space, Button } from "antd";
import { SaveOutlined, CloseOutlined } from "@ant-design/icons";
import type {
  ClinicalHistoryMedicalHistory,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";
import dayjs from "dayjs";
import { MedicalHistoryFormFields } from "./MedicalHistoryFormFields";

interface MedicalHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: UpdateMedicalHistoryRequest) => Promise<void>;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  loading: boolean;
}

export function MedicalHistoryDrawer({
  open,
  onClose,
  onSave,
  medicalHistory,
  loading,
}: MedicalHistoryDrawerProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
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
    // intensity 0 = "sin dolor" — backend validator rejects 0, expects null when not applicable
    const rawIntensity = values.painIntensity as number | undefined;
    const intensity = rawIntensity && rawIntensity > 0 ? rawIntensity : null;

    // Only include currentPain object if at least one field is filled
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
    await onSave(data);
  };

  return (
    <Drawer
      title={
        medicalHistory ? "Editar historia médica" : "Crear historia médica"
      }
      open={open}
      onClose={onClose}
      size="large"
      destroyOnHidden
      extra={
        <Space>
          <Button icon={<CloseOutlined />} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={loading}
            onClick={() => form.submit()}
          >
            Guardar
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        autoComplete="off"
      >
        <MedicalHistoryFormFields />
      </Form>
    </Drawer>
  );
}
