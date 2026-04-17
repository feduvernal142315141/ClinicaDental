"use client";

import { Form, Space, FormProps } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  SaveOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

export interface FormContainerProps<T = unknown>
  extends Omit<FormProps<T>, "children"> {
  /** Form content */
  children: React.ReactNode;
  /** Form title */
  title?: string;
  /** Form description */
  description?: string;
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Show cancel button */
  showCancel?: boolean;
  /** Show back button */
  showBack?: boolean;
  /** Back button text */
  backText?: string;
  /** Loading state */
  loading?: boolean;
  /** Submit callback */
  onSubmit?: (values: T) => void | Promise<void>;
  /** Cancel callback */
  onCancel?: () => void;
  /** Back callback */
  onBack?: () => void;
  /** Form layout */
  layout?: "horizontal" | "vertical" | "inline";
  /** Label column span (for horizontal layout) */
  labelCol?: { span: number };
  /** Wrapper column span (for horizontal layout) */
  wrapperCol?: { span: number };
  /** Additional CSS class */
  className?: string;
}

/**
 * Ant Design Form Container component
 * Wraps form content with consistent layout and action buttons
 *
 * @example
 * <FormContainer
 *   title="Nuevo Usuario"
 *   description="Complete los datos del usuario"
 *   submitText="Guardar"
 *   onSubmit={handleSubmit}
 *   onCancel={() => router.back()}
 *   loading={isLoading}
 * >
 *   <FormInput name="names" label="Nombres" required />
 *   <FormInput name="email" label="Email" type="email" required />
 * </FormContainer>
 */
export function FormContainer<T = unknown>({
  children,
  title,
  description,
  submitText = "Guardar",
  cancelText = "Cancelar",
  showCancel = true,
  showBack = false,
  backText = "Volver",
  loading = false,
  onSubmit,
  onCancel,
  onBack,
  layout = "vertical",
  labelCol,
  wrapperCol,
  className,
  ...formProps
}: FormContainerProps<T>) {
  const [form] = Form.useForm<T>();

  const handleFinish = async (values: T) => {
    await onSubmit?.(values);
  };

  return (
    <div className={className}>
      {/* Header */}
      {(title || description || showBack) && (
        <div className="mb-6">
          {showBack && onBack && (
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
              className="mb-2 -ml-3"
            >
              {backText}
            </Button>
          )}
          {title && <h2 className="text-xl font-semibold mb-1">{title}</h2>}
          {description && (
            <p className="text-gray-500 text-sm">{description}</p>
          )}
        </div>
      )}

      {/* Form */}
      <Form<T>
        form={form}
        layout={layout}
        labelCol={labelCol}
        wrapperCol={wrapperCol}
        onFinish={handleFinish}
        disabled={loading}
        {...formProps}
      >
        {children}

        {/* Action Buttons */}
        <Form.Item className="mt-6 mb-0">
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
            >
              {submitText}
            </Button>
            {showCancel && onCancel && (
              <Button onClick={onCancel} icon={<CloseOutlined />}>
                {cancelText}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}

/**
 * Form section component for grouping fields
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm mb-4">{description}</p>
      )}
      {children}
    </div>
  );
}
