"use client";

import { Modal } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";

export interface OdontogramConfirmOptions {
  title: string;
  description: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  onOk: () => void;
  onCancel?: () => void;
}

/**
 * Wrapper de Modal.confirm de AntD para el módulo odontograma.
 * Reemplaza AlertDialog de Radix para confirmaciones de borrado/cierre.
 */
export function odontogramConfirm({
  title,
  description,
  okText = "Aceptar",
  cancelText = "Cancelar",
  danger = false,
  onOk,
  onCancel,
}: OdontogramConfirmOptions) {
  Modal.confirm({
    title,
    icon: <ExclamationCircleFilled />,
    content: description,
    okText,
    cancelText,
    okButtonProps: danger ? { danger: true } : undefined,
    onOk,
    onCancel,
  });
}
