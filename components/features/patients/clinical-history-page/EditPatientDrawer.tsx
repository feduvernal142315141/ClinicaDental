"use client";

import { Drawer, Space, Button } from "antd";
import { CloseOutlined, SaveOutlined } from "@ant-design/icons";
import { PatientForm } from "@/components/features/patients/form/PatientForm";
import type { Patient } from "@/lib/entity/patients";
import { useEditPatientDrawer } from "@/lib/hooks/patients/clinical-history-page/use-edit-patient-drawer";

interface EditPatientDrawerProps {
  open: boolean;
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPatientDrawer({
  open,
  patient,
  onClose,
  onSuccess,
}: EditPatientDrawerProps) {
  const {
    formRef,
    saving,
    handleClose,
    handleSubmit,
    handleLoadingChange,
    handleSuccess,
  } = useEditPatientDrawer({
    onClose,
    onSuccess,
  });

  return (
    <Drawer
      title="Editar paciente"
      placement="right"
      size={600}
      open={open}
      onClose={handleClose}
      destroyOnHidden
      extra={
        <Space>
          <Button
            icon={<CloseOutlined />}
            type="default"
            danger
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
      }
    >
      <PatientForm
        ref={formRef}
        patientId={patient.id}
        initialData={patient}
        compact
        hideActions
        onLoadingChange={handleLoadingChange}
        onSuccess={handleSuccess}
        onCancel={handleClose}
      />
    </Drawer>
  );
}
