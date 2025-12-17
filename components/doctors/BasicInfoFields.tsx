"use client";

import { Form, Input, Col } from "antd";

/**
 * BasicInfoFields Component
 * Fields: Name, Email, Phone (3 columns)
 */
export function BasicInfoFields() {
  return (
    <>
      <Col xs={24} sm={24} md={8}>
        <Form.Item
          label="Nombre"
          name="name"
          rules={[
            { required: true, message: "El nombre es requerido" },
            { min: 2, message: "Mínimo 2 caracteres" },
            { max: 100, message: "Máximo 100 caracteres" },
          ]}
        >
          <Input placeholder="Nombre completo" />
        </Form.Item>
      </Col>

      <Col xs={24} sm={24} md={8}>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "El email es requerido" },
            { type: "email", message: "Email inválido" },
            { max: 100, message: "Máximo 100 caracteres" },
          ]}
        >
          <Input placeholder="correo@ejemplo.com" />
        </Form.Item>
      </Col>

      <Col xs={24} sm={24} md={8}>
        <Form.Item
          label="Teléfono"
          name="phone"
          rules={[
            { required: true, message: "El teléfono es requerido" },
            { pattern: /^[0-9+\-\s()]+$/, message: "Formato inválido" },
            { min: 7, message: "Mínimo 7 caracteres" },
            { max: 20, message: "Máximo 20 caracteres" },
          ]}
        >
          <Input placeholder="+1 234 567 8900" />
        </Form.Item>
      </Col>
    </>
  );
}
