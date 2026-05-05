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
  /** Banner sticky superior (ej. cambios sin guardar, modo lectura) */
  topBanner?: ReactNode;
}

/**
 * Wrapper de Modal AntD para el módulo odontograma.
 * Diseño premium con header enriquecido, banner sticky y responsive.
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
  topBanner,
}: OdontogramModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        title || description ? (
          <div className="space-y-0.5">
            {title && (
              <span className="text-lg font-bold leading-tight">{title}</span>
            )}
            {description && (
              <p className="text-xs text-gray-500 font-normal leading-snug">
                {description}
              </p>
            )}
          </div>
        ) : undefined
      }
      footer={footer}
      width={width}
      centered
      style={{ maxWidth: 1100, top: 20 }}
      styles={{
        body: { maxHeight: "calc(100vh - 180px)", overflowY: "auto", overflowX: "hidden", paddingTop: 0 },
        header: { paddingBottom: 8, marginBottom: 0 },
      }}
      className={bodyClassName}
      destroyOnHidden
      mask={{ closable: false }}
    >
      {topBanner && (
        <div className="sticky top-0 z-10 -mx-6 px-6 mb-3">{topBanner}</div>
      )}
      {children}
    </Modal>
  );
}
