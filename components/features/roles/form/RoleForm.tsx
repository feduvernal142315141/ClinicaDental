"use client";

import { Card } from "@/components/ui/antd";
import { isSystemRole } from "@/lib/utils/roles.utils";
import { useRoleForm } from "@/lib/hooks/roles/use-role-form";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Alert, Divider, Form, Input, Space } from "antd";
import { PermissionsSelector } from "./PermissionsSelector";

interface RoleFormProps {
  roleId?: string;
  basePath?: string;
}

type FormValues = {
  roleName: string;
  permissions: string[];
};

export function RoleForm({
  roleId,
  basePath = "/settings/roles",
}: RoleFormProps) {
  const { form, isEdit, loading, handleSubmit, handleCancel } = useRoleForm({
    roleId,
    basePath,
  });

  const isSystem = roleId ? isSystemRole(roleId) : false;

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      disabled={loading}
      initialValues={{
        permissions: [],
      }}
    >
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          {isEdit && isSystem && (
            <Alert
              type="info"
              showIcon
              title="Este rol es de sistema"
              description="Algunos campos pueden estar restringidos."
            />
          )}

          <Form.Item
            label="Nombre del Rol"
            name="roleName"
            rules={[
              { required: true, message: "El nombre del rol es obligatorio" },
              { min: 3, message: "El nombre debe tener mínimo 3 caracteres" },
              { max: 50, message: "El nombre debe tener máximo 50 caracteres" },
            ]}
          >
            <Input placeholder="Ej: Administrador" disabled={isSystem} />
          </Form.Item>

          <Divider>Permisos</Divider>

          <Form.Item
            name="permissions"
            valuePropName="value"
            tooltip='Los permisos se guardan como "module-value" (bitmask)'
          >
            <PermissionsSelector disabled={loading || isSystem} />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {isEdit ? "Guardar" : "Crear"}
            </Button>
          </div>
        </Space>
      </Card>
    </Form>
  );
}
