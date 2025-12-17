"use client";

import { Form, Select, Switch, Col } from "antd";

const { Option } = Select;

/**
 * RoleStatusFields Component
 * Fields: Role, Active Status (2 columns)
 */
export function RoleStatusFields() {
  return (
    <>
      <Col xs={24} sm={24} md={12}>
        <Form.Item
          label="Rol"
          name="role"
          rules={[
            { required: true, message: "El rol es requerido" },
          ]}
        >
          <Select placeholder="Seleccione un rol">
            <Option value="admin">Administrador</Option>
            <Option value="doctor">Doctor</Option>
            <Option value="assistant">Asistente</Option>
            <Option value="receptionist">Recepcionista</Option>
          </Select>
        </Form.Item>
      </Col>

      <Col xs={24} sm={24} md={12}>
        <Form.Item
          label="Estado"
          name="active"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch 
            checkedChildren="Activo" 
            unCheckedChildren="Inactivo" 
          />
        </Form.Item>
      </Col>
    </>
  );
}
