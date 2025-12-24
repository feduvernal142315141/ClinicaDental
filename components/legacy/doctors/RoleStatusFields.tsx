"use client";

import { Row, Col } from "antd";
import { FormSelect, FormSwitch } from "@/components/ui/antd";

// Mock data - should come from API
const ROLES = [
  { value: "role-1", label: "Administrador" },
  { value: "role-2", label: "Doctor" },
  { value: "role-3", label: "Recepcionista" },
];

/**
 * Role and status fields section for doctor
 * 2 columns: Role, Active Status
 */
export function RoleStatusFields() {
  return (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <FormSelect
          name="roleId"
          label="Rol"
          required
          options={ROLES}
          placeholder="Seleccione un rol"
        />
      </Col>
      <Col xs={24} md={12}>
        <FormSwitch
          name="active"
          label="Estado"
          checkedText="Activo"
          uncheckedText="Inactivo"
        />
      </Col>
    </Row>
  );
}
