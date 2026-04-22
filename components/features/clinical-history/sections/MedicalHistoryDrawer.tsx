"use client";

import { useEffect } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  Slider,
  DatePicker,
  Space,
  Button,
} from "antd";
import { SaveOutlined, CloseOutlined } from "@ant-design/icons";
import type {
  ClinicalHistoryMedicalHistory,
  UpdateMedicalHistoryRequest,
} from "@/lib/entity/clinical-history";
import dayjs from "dayjs";

const { TextArea } = Input;

interface MedicalHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: UpdateMedicalHistoryRequest) => Promise<void>;
  medicalHistory: ClinicalHistoryMedicalHistory | null;
  loading: boolean;
}

const PAIN_TYPE_OPTIONS = [
  { label: "Agudo", value: "agudo" },
  { label: "Pulsátil", value: "pulsátil" },
  { label: "Sordo", value: "sordo" },
  { label: "Punzante", value: "punzante" },
  { label: "Intermitente", value: "intermitente" },
  { label: "Constante", value: "constante" },
];

const MARITAL_STATUS_OPTIONS = [
  { label: "Soltero/a", value: "Soltero/a" },
  { label: "Casado/a", value: "Casado/a" },
  { label: "Divorciado/a", value: "Divorciado/a" },
  { label: "Viudo/a", value: "Viudo/a" },
  { label: "Unión libre", value: "Unión libre" },
];

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

  const handleFinish = async (values: unknown) => {
    const data: UpdateMedicalHistoryRequest = {
      occupation: values.occupation,
      maritalStatus: values.maritalStatus,
      systemicDiseases: values.systemicDiseases ?? [],
      currentMedications: values.currentMedications ?? [],
      allergies: values.allergies ?? [],
      previousSurgeries: values.previousSurgeries ?? [],
      chiefComplaint: values.chiefComplaint,
      habits: values.habits ?? [],
      currentPain: {
        location: values.painLocation,
        intensity: values.painIntensity,
        type: values.painType,
        duration: values.painDuration,
      },
      lastDentalVisit: values.lastDentalVisit
        ? values.lastDentalVisit.format("YYYY-MM-DD")
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
        {/* Personal data */}
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

        {/* Medical antecedents */}
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

        {/* Dental info */}
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
        <div
          style={{
            background: "#fafafa",
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Dolor actual</div>

          <Form.Item label="Ubicación" name="painLocation">
            <Input placeholder="Ej: Molar inferior derecho" />
          </Form.Item>

          <Form.Item label="Intensidad (0-10)" name="painIntensity">
            <Slider
              min={0}
              max={10}
              marks={{
                0: "0",
                5: "5",
                10: "10",
              }}
            />
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
      </Form>
    </Drawer>
  );
}
