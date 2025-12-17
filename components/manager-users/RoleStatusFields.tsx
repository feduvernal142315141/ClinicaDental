"use client";

import { Row, Col } from "antd";
import { FormSelect, FormSwitch } from "@/components/ui/antd";

// Mock data - should come from API
const ROLES = [
  { value: "role-1", label: "Administrador" },
  { value: "role-2", label: "Doctor" },
  { value: "role-3", label: "Recepcionista" },
];

const FINANCIAL_INSTITUTIONS = [
  { value: "fi-1", label: "Institución A" },
  { value: "fi-2", label: "Institución B" },
  { value: "fi-3", label: "Institución C" },
];

/**
 * Role and status fields section
 * 3 columns: Role, Financial Institutions, Active Status
 */
export function RoleStatusFields() {
  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <FormSelect
          name="roleId"
          label="Rol"
          required
          options={ROLES}
          placeholder="Seleccione un rol"
        />
      </Col>
      <Col xs={24} md={8}>
        <FormSelect
          name="financialInstitutions"
          label="Instituciones Financieras"
          required
          multiple
          options={FINANCIAL_INSTITUTIONS}
          placeholder="Seleccione instituciones"
        />
      </Col>
      <Col xs={24} md={8}>
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
