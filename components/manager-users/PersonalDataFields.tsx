"use client";

import { Row, Col } from "antd";
import { FormInput } from "@/components/ui/antd";

/**
 * Personal data fields section
 * 3 columns: Surnames, Email, Phone
 */
export function PersonalDataFields() {
  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <FormInput
          name="surnames"
          label="Apellidos"
          placeholder="Ingrese apellidos"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormInput
          name="email"
          label="Correo Electrónico"
          type="email"
          required
          placeholder="usuario@ejemplo.com"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormInput
          name="cellphone"
          label="Teléfono Celular"
          type="tel"
          placeholder="+57 300 123 4567"
        />
      </Col>
    </Row>
  );
}
