"use client";

import { useEffect } from "react";
import { Form, Select, Switch, Col, Spin } from "antd";
import { useRoles } from "@/lib/hooks/roles";

const { Option } = Select;

/**
 * RoleStatusFields Component
 * Fields: Role, Active Status (2 columns)
 */
export function RoleStatusFields() {
  const { roles, loading, fetchRoles } = useRoles();

  // Load roles on mount
  useEffect(() => {
    fetchRoles({ page: 0, pageSize: 0 }); // pageSize 0 = get all
  }, [fetchRoles]);

  return (
    <>
      <Col xs={24} sm={24} md={12}>
        <Form.Item
          label="Rol"
          name="roleId"
          rules={[{ required: true, message: "El rol es requerido" }]}
        >
          <Select
            placeholder="Seleccione un rol"
            loading={loading}
            notFoundContent={
              loading ? <Spin size="small" /> : "No hay roles disponibles"
            }
          >
            {roles.map((role) => (
              <Option key={role.id} value={role.id}>
                {role.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col xs={24} sm={24} md={12}>
        <Form.Item label="Estado" name="active" valuePropName="checked">
          <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
        </Form.Item>
      </Col>
    </>
  );
}
