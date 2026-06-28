"use client";

import { Form, Input, Select, DatePicker } from "antd";

export const PAIN_TYPE_OPTIONS = [
  { label: "Agudo", value: "agudo" },
  { label: "Pulsátil", value: "pulsátil" },
  { label: "Sordo", value: "sordo" },
  { label: "Punzante", value: "punzante" },
  { label: "Intermitente", value: "intermitente" },
  { label: "Constante", value: "constante" },
];

export const MARITAL_STATUS_OPTIONS = [
  { label: "Soltero/a", value: "Soltero/a" },
  { label: "Casado/a", value: "Casado/a" },
  { label: "Divorciado/a", value: "Divorciado/a" },
  { label: "Viudo/a", value: "Viudo/a" },
  { label: "Unión libre", value: "Unión libre" },
];

interface MedicalHistoryFormFieldsProps {
  /** Use compact spacing (AntecedentesPanel style). Defaults to false (Drawer style). */
  compact?: boolean;
}

/**
 * Shared Form.Item fields for medical history forms.
 * Must be rendered inside an Ant Design <Form> context.
 */
export function MedicalHistoryFormFields(
  _props: MedicalHistoryFormFieldsProps = {},
) {
  return (
    <>
      <Form.Item label="Ocupación" name="occupation">
        <Input placeholder="Ej: Ingeniero, Estudiante..." />
      </Form.Item>

      <Form.Item label="Estado civil" name="maritalStatus">
        <Select
          placeholder="Seleccionar"
          options={MARITAL_STATUS_OPTIONS}
          allowClear
        />
      </Form.Item>

      <Form.Item label="Enfermedades sistémicas" name="systemicDiseases">
        <Select
          mode="tags"
          placeholder="Escriba y presione Enter para agregar"
        />
      </Form.Item>

      <Form.Item label="Medicamentos actuales" name="currentMedications">
        <Select
          mode="tags"
          placeholder="Escriba y presione Enter para agregar"
        />
      </Form.Item>

      <Form.Item label="Alergias" name="allergies">
        <Select
          mode="tags"
          placeholder="Escriba y presione Enter para agregar"
        />
      </Form.Item>

      <Form.Item label="Cirugías previas" name="previousSurgeries">
        <Select
          mode="tags"
          placeholder="Escriba y presione Enter para agregar"
        />
      </Form.Item>

      <Form.Item label="Hábitos" name="habits">
        <Select
          mode="tags"
          placeholder="Ej: Bruxismo, Tabaquismo, Onicofagia..."
        />
      </Form.Item>

      <Form.Item label="Última visita dental" name="lastDentalVisit">
        <DatePicker
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
          placeholder="Seleccionar fecha"
        />
      </Form.Item>
    </>
  );
}
