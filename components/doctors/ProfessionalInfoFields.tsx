"use client";

import { Form, Input, Select, Col } from "antd";

const { Option } = Select;

/**
 * ProfessionalInfoFields Component
 * Fields: LicenceNumber, Specialty, Gender (3 columns)
 */
export function ProfessionalInfoFields() {
  return (
    <>
      <Col xs={24} sm={24} md={8}>
        <Form.Item
          label="Número de Licencia"
          name="licenceNumber"
          rules={[
            { required: true, message: "El número de licencia es requerido" },
            { min: 3, message: "Mínimo 3 caracteres" },
            { max: 50, message: "Máximo 50 caracteres" },
          ]}
        >
          <Input placeholder="Ej: LIC-123456" />
        </Form.Item>
      </Col>

      <Col xs={24} sm={24} md={8}>
        <Form.Item
          label="Especialidad"
          name="specialty"
          rules={[
            { max: 100, message: "Máximo 100 caracteres" },
          ]}
        >
          <Input placeholder="Ej: Odontología General" />
        </Form.Item>
      </Col>

      <Col xs={24} sm={24} md={8}>
        <Form.Item
          label="Género"
          name="gender"
          rules={[
            { required: true, message: "El género es requerido" },
          ]}
        >
          <Select placeholder="Seleccione género">
            <Option value="male">Masculino</Option>
            <Option value="female">Femenino</Option>
            <Option value="other">Otro</Option>
          </Select>
        </Form.Item>
      </Col>
    </>
  );
}
