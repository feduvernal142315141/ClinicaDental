"use client";

import { Drawer } from "antd";
import { PatientForm } from "@/components/features/patients/form/PatientForm";
import type { Patient as PatientFull } from "@/lib/entity/patients";
import type { Patient } from "@/lib/entity/patients/patients";

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
  return (
    <Drawer
      placement="right"
      width={600}
      destroyOnClose
      open={open}
      onClose={onClose}
      title="Editar paciente"
    >
      <div style={{ overflowY: "auto", height: "100%" }}>
        <PatientForm
          patientId={patient.id}
          initialData={patient as unknown as PatientFull}
          compact
          onSuccess={onSuccess}
          onCancel={onClose}
        />
      </div>
    </Drawer>
  );
}
