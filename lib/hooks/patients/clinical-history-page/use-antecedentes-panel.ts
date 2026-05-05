"use client";

import { useCallback, useEffect, useState } from "react";
import { Form, Modal } from "antd";
import dayjs from "dayjs";
import type {
  ClinicalHistoryMedicalHistory,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";

interface UseAntecedentesPanelParams {
  open: boolean;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  onSave: (data: UpdateMedicalHistoryRequest) => Promise<void>;
  onClose: () => void;
  onSaved: () => void;
}

export function useAntecedentesPanel({
  open,
  medicalHistory,
  onSave,
  onClose,
  onSaved,
}: UseAntecedentesPanelParams) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

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
      return;
    }

    form.resetFields();
  }, [form, medicalHistory, open]);

  const handleFinish = useCallback(
    async (values: Record<string, unknown>) => {
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
          ? (
              values.lastDentalVisit as { format: (pattern: string) => string }
            ).format("YYYY-MM-DD")
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
    },
    [onSave, onSaved],
  );

  const handleClose = useCallback(() => {
    if (!form.isFieldsTouched()) {
      onClose();
      return;
    }

    Modal.confirm({
      title: "¿Descartar cambios?",
      content: "Hay cambios sin guardar. ¿Desea cerrar de todos modos?",
      okText: "Sí, cerrar",
      cancelText: "Continuar editando",
      okButtonProps: { danger: true },
      onOk: onClose,
    });
  }, [form, onClose]);

  const handleSubmit = useCallback(() => {
    form.submit();
  }, [form]);

  return {
    form,
    saving,
    error,
    panelTitle: medicalHistory ? "Editar Antecedentes" : "Crear Antecedentes",
    handleFinish,
    handleClose,
    handleSubmit,
  };
}
