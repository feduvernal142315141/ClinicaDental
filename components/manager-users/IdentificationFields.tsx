"use client";

import { Row, Col } from "antd";
import { FormInput, FormSelect } from "@/components/ui/antd";

// Mock data - should come from API
const IDENTIFICATION_TYPES = [
  { value: "1", label: "Cédula de Ciudadanía" },
  { value: "2", label: "Cédula de Extranjería" },
  { value: "3", label: "Pasaporte" },
];

/**
 * Identification fields section
 * 3 columns: Type, Number, Names
 */
export function IdentificationFields() {
  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <FormSelect
          name="identificationTypeId"
          label="Tipo de Identificación"
          required
          options={IDENTIFICATION_TYPES}
          placeholder="Seleccione tipo"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormInput
          name="identificationNumber"
          label="Número de Identificación"
          required
          placeholder="Ingrese número"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormInput
          name="names"
          label="Nombres"
          required
          placeholder="Ingrese nombres"
        />
      </Col>
    </Row>
  );
}
