"use client";

import { Row, Col } from "antd";
import { FormInput } from "@/components/ui/antd";

/**
 * Basic information fields for doctor
 * 3 columns: Name, Email, Phone
 */
export function BasicInfoFields() {
  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <FormInput
          name="name"
          label="Nombre Completo"
          required
          placeholder="Dr. Juan Pérez"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormInput
          name="email"
          label="Correo Electrónico"
          type="email"
          required
          placeholder="doctor@clinica.com"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormInput
          name="phone"
          label="Teléfono"
          type="tel"
          placeholder="+57 300 123 4567"
        />
      </Col>
    </Row>
  );
}
