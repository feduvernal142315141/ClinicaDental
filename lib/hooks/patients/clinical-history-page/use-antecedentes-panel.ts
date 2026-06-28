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
      });
      return;
    }

    form.resetFields();
  }, [form, medicalHistory, open]);

  const handleFinish = useCallback(
    async (values: Record<string, unknown>) => {
      // Motivo de consulta y dolor actual son per-visita (PatientVisitRecord),
      // ya no se capturan ni envían desde la anamnesis (fuente única).
      const data: UpdateMedicalHistoryRequest = {
        occupation: values.occupation as string,
        maritalStatus: values.maritalStatus as string,
        systemicDiseases: (values.systemicDiseases as string[]) ?? [],
        currentMedications: (values.currentMedications as string[]) ?? [],
        allergies: (values.allergies as string[]) ?? [],
        previousSurgeries: (values.previousSurgeries as string[]) ?? [],
        habits: (values.habits as string[]) ?? [],
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
