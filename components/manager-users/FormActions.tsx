"use client";

import { Form, Space, Button } from "antd";
import { SaveOutlined, CloseOutlined } from "@ant-design/icons";

interface FormActionsProps {
  /** Whether in edit mode */
  isEdit?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Cancel handler */
  onCancel: () => void;
}

/**
 * Form action buttons
 * Save/Update and Cancel buttons
 */
export function FormActions({
  isEdit = false,
  isLoading = false,
  onCancel,
}: FormActionsProps) {
  return (
    <Form.Item className="mb-0 mt-6">
      <Space>
        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          icon={<SaveOutlined />}
        >
          {isEdit ? "Actualizar" : "Guardar"}
        </Button>
        <Button onClick={onCancel} icon={<CloseOutlined />}>
          Cancelar
        </Button>
      </Space>
    </Form.Item>
  );
}
