"use client";

import { useRef, useState } from "react";
import { Drawer, Space, Button } from "antd";
import { CloseOutlined, SaveOutlined } from "@ant-design/icons";
import { PatientForm, type PatientFormRef } from "@/components/features/patients/form/PatientForm";
import type { Patient } from "@/lib/entity/patients";

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
  const formRef = useRef<PatientFormRef>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Drawer
      title="Editar paciente"
      placement="right"
      size={600}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Space>
          <Button
            icon={<CloseOutlined />}
            type="default"
            danger
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => formRef.current?.submit()}
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
        onLoadingChange={setSaving}
        onSuccess={onSuccess}
        onCancel={onClose}
      />
    </Drawer>
  );
}
