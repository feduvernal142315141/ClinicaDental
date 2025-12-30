"use client";

import { Space } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { CloseOutlined, SaveOutlined } from "@ant-design/icons";

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
        danger
        onClick={onCancel}
        size="large"
        disabled={loading}
        icon={<CloseOutlined />}
      >
        {cancelText}
      </Button>
      <Button
        type="primary"
        htmlType="submit"
        icon={<SaveOutlined />}
        loading={loading}
        size="large"
      >
        {submitText}
      </Button>
    </Space>
  );
}
