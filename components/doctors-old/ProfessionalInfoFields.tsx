"use client";

import { Row, Col } from "antd";
import { FormInput, FormSelect } from "@/components/ui/antd";

// Mock data - should come from API
const GENDER_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
  { value: "Otro", label: "Otro" },
];

/**
 * Professional information fields for doctor
 * 3 columns: Licence Number, Specialty, Gender
 */
export function ProfessionalInfoFields() {
  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <FormInput
          name="licenceNumber"
          label="Número de Licencia"
          required
          placeholder="MP-123456"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormInput
          name="specialty"
          label="Especialidad"
          placeholder="Cardiología"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormSelect
          name="gender"
          label="Género"
          options={GENDER_OPTIONS}
          placeholder="Seleccione género"
        />
      </Col>
    </Row>
  );
}
