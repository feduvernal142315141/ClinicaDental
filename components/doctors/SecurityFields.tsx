"use client";

import { Form, Input, Col } from "antd";
import { PasswordStrength } from "../auth/PasswordStrength";

/**
 * SecurityFields Component
 * Fields: Password, Confirm Password (with strength indicator)
 */
interface SecurityFieldsProps {
  /** Whether editing existing doctor (password optional) */
  isEditing?: boolean;
}

export function SecurityFields({ isEditing = false }: SecurityFieldsProps) {
  return (
    <>
      <Col xs={24} sm={24} md={12}>
        <Form.Item
          label="Contraseña"
          name="password"
          rules={[
            {
              required: !isEditing,
              message: "La contraseña es requerida",
            },
            { min: 8, message: "Mínimo 8 caracteres" },
            { max: 50, message: "Máximo 50 caracteres" },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
              message: "Debe contener mayúsculas, minúsculas y números",
            },
          ]}
          help={
            !isEditing ? (
              <PasswordStrength />
            ) : (
              "Dejar vacío para mantener la contraseña actual"
            )
          }
        >
          <Input.Password
            placeholder={
              isEditing ? "Dejar vacío para no cambiar" : "Mínimo 8 caracteres"
            }
          />
        </Form.Item>
      </Col>

      <Col xs={24} sm={24} md={12}>
        <Form.Item
          label="Confirmar Contraseña"
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            {
              required: !isEditing,
              message: "Confirme la contraseña",
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Las contraseñas no coinciden")
                );
              },
            }),
          ]}
        >
          <Input.Password placeholder="Repita la contraseña" />
        </Form.Item>
      </Col>
    </>
  );
}
