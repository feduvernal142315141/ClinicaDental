"use client";

import { Button, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";

/**
 * FormActions Component
 * Save/Cancel buttons for forms
 */
interface FormActionsProps {
  /** Whether form is submitting */
  loading?: boolean;
  /** Cancel handler */
  onCancel: () => void;
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
}

export function FormActions({
  loading = false,
  onCancel,
  submitText = "Guardar",
  cancelText = "Cancelar",
}: FormActionsProps) {
  return (
    <Space>
      <Button
        type="primary"
        htmlType="submit"
        icon={<SaveOutlined />}
        loading={loading}
        size="large"
      >
        {submitText}
      </Button>
      <Button onClick={onCancel} size="large" disabled={loading}>
        {cancelText}
      </Button>
    </Space>
  );
}
