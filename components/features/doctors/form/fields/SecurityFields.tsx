"use client";

import { Form, Input, Col, Row, Flex } from "antd";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { PASSWORD_MIN_LENGTH, failedPasswordRules } from "@/lib/validation/password-policy";

/** Regla antd que aplica la política central (la misma que valida el backend). Vacío = sin cambio. */
const passwordPolicyRule = {
  validator: (_: unknown, value?: string) => {
    if (!value) return Promise.resolve();
    const [firstFailed] = failedPasswordRules(value);
    return firstFailed ? Promise.reject(new Error(firstFailed.message)) : Promise.resolve();
  },
};

/**
 * SecurityFields Component
 * Fields: Password, Confirm Password (with strength indicator)
 */
interface SecurityFieldsProps {
  /** Whether editing existing doctor (password optional) */
  isEditing?: boolean;
  /** Render variant. Default: doctor form (create/edit). */
  mode?: "doctorForm" | "changePassword";
}

export function SecurityFields({
  isEditing = false,
  mode = "doctorForm",
}: SecurityFieldsProps) {
  const isChangePassword = mode === "changePassword";

  if (isChangePassword) {
    return (
      <Flex orientation="vertical" className="w-full mt-2">
        <Form.Item
          label="Contraseña actual"
          name="oldPassword"
          rules={[
            {
              required: true,
              message: "Ingresa tu contraseña actual",
            },
          ]}
        >
          <Input.Password placeholder="Contraseña actual" />
        </Form.Item>

        <Form.Item
          label="Nueva contraseña"
          name="password"
          rules={[
            {
              required: true,
              message: "Ingresa tu nueva contraseña",
            },
            passwordPolicyRule,
          ]}
          help={<PasswordStrength />}
        >
          <Input.Password placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`} />
        </Form.Item>

        <Form.Item
          label="Confirmar Contraseña"
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            {
              required: true,
              message: "Confirma tu nueva contraseña",
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
      </Flex>
    );
  }

  return (
    <Row gutter={[16, 16]} className="w-full mt-2">
      <Col xs={24} md={12}>
        <Form.Item
          label="Contraseña"
          name="password"
          rules={[
            {
              required: !isEditing,
              message: "La contraseña es requerida",
            },
            passwordPolicyRule,
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
              isEditing ? "Dejar vacío para no cambiar" : `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`
            }
          />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
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
    </Row>
  );
}
