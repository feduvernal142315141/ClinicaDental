"use client";

import { Empty } from "antd";

export interface OdontogramEmptyStateProps {
  /** Mensaje descriptivo mostrado debajo del ícono */
  description: string;
}

/**
 * Estado vacío genérico para listas de eventos del odontograma.
 * Envuelve AntD Empty para mantener la consistencia visual del módulo.
 */
export function OdontogramEmptyState({
  description,
}: OdontogramEmptyStateProps) {
  return (
    <div className="py-12">
      <Empty description={description} />
    </div>
  );
}
