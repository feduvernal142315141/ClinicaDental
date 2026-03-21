"use client";

import { Modal } from "antd";
import type { ReactNode } from "react";

export interface OdontogramModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: string;
  children: ReactNode;
  width?: string | number;
  /** Clase CSS del body del modal */
  bodyClassName?: string;
  footer?: ReactNode | null;
}

/**
 * Wrapper de Modal AntD para el módulo odontograma.
 * Reemplaza Dialog/DialogContent de Radix manteniendo una API similar.
 */
export function OdontogramModal({
  open,
  onClose,
  title,
  description,
  children,
  width = "95vw",
  bodyClassName,
  footer = null,
}: OdontogramModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        title || description ? (
          <div className="space-y-1 pb-2 border-b">
            {title && <span className="text-2xl font-bold">{title}</span>}
            {description && (
              <p className="text-sm text-gray-500 font-normal">{description}</p>
            )}
          </div>
        ) : undefined
      }
      footer={footer}
      width={width}
      style={{ maxWidth: 1400, top: 20 }}
      styles={{
        body: { maxHeight: "calc(95vh - 120px)", overflowY: "auto" },
      }}
      className={bodyClassName}
      destroyOnHidden
      mask={{ closable: false }}
    >
      {children}
    </Modal>
  );
}
