"use client";

import { Form, Input, Select, Slider, DatePicker } from "antd";

const { TextArea } = Input;

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
export function MedicalHistoryFormFields({
  compact = false,
}: MedicalHistoryFormFieldsProps) {
  const painBoxStyle = compact
    ? {
        background: "var(--hover)",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
      }
    : {
        background: "var(--hover)",
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
      };

  const painTitleStyle = compact
    ? { fontWeight: 600, marginBottom: 8, fontSize: 12 }
    : { fontWeight: 600, marginBottom: 12 };

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

      <Form.Item label="Motivo de consulta" name="chiefComplaint">
        <TextArea rows={3} placeholder="Describa el motivo de consulta" />
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

      {/* Current pain */}
      <div style={painBoxStyle}>
        <div style={painTitleStyle}>Dolor actual</div>

        <Form.Item label="Ubicación" name="painLocation">
          <Input placeholder="Ej: Molar inferior derecho" />
        </Form.Item>

        <Form.Item label="Intensidad (0-10)" name="painIntensity">
          <Slider min={0} max={10} marks={{ 0: "0", 5: "5", 10: "10" }} />
        </Form.Item>

        <Form.Item label="Tipo de dolor" name="painType">
          <Select
            placeholder="Seleccionar tipo"
            options={PAIN_TYPE_OPTIONS}
            allowClear
          />
        </Form.Item>

        <Form.Item label="Duración" name="painDuration" style={{ margin: 0 }}>
          <Input placeholder="Ej: 2 días, 1 semana..." />
        </Form.Item>
      </div>
    </>
  );
}
