"use client";

import { App, Modal } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { useCallback } from "react";

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
 * Hook que retorna una función `confirm` context-aware (usa App.useApp).
 * Evita el warning "Static function can not consume context".
 */
export function useOdontogramConfirm() {
  const { modal } = App.useApp();

  const confirm = useCallback(
    ({
      title,
      description,
      okText = "Aceptar",
      cancelText = "Cancelar",
      danger = false,
      onOk,
      onCancel,
    }: OdontogramConfirmOptions) => {
      modal.confirm({
        title,
        icon: <ExclamationCircleFilled />,
        content: description,
        okText,
        cancelText,
        okButtonProps: danger ? { danger: true } : undefined,
        onOk,
        onCancel,
      });
    },
    [modal],
  );

  return confirm;
}

/**
 * @deprecated Usa `useOdontogramConfirm()` para evitar el warning de contexto AntD.
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
