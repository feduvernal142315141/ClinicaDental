"use client";

import { Row, Col } from "antd";
import { FormInput } from "@/components/ui/antd";
import { PasswordStrength } from "./PasswordStrength";

interface SecurityFieldsProps {
  /** Whether in edit mode */
  isEdit?: boolean;
  /** Current password value for strength indicator */
  password: string;
  /** Password change handler */
  onPasswordChange: (value: string) => void;
}

/**
 * Security fields section for doctor
 * 2 columns: Password, Confirm Password (with strength indicator)
 */
export function SecurityFields({
  isEdit = false,
  password,
  onPasswordChange,
}: SecurityFieldsProps) {
  return (
    <>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <FormInput
            name="password"
            label={isEdit ? "Nueva Contraseña (opcional)" : "Contraseña"}
            type="password"
            required={!isEdit}
            placeholder={
              isEdit ? "Dejar vacío para mantener" : "Ingrese contraseña"
            }
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          <PasswordStrength password={password} />
        </Col>
        <Col xs={24} md={12}>
          <FormInput
            name="confirmPassword"
            label="Confirmar Contraseña"
            type="password"
            required={!isEdit && !!password}
            placeholder="Confirme la contraseña"
            rules={[
              ({ getFieldValue }: unknown) => ({
                validator(_: unknown, value: string) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Las contraseñas no coinciden")
                  );
                },
              }),
            ]}
          />
        </Col>
      </Row>
    </>
  );
}
