"use client";

import { EmptyState } from "@/components/ui";

export interface OdontogramEmptyStateProps {
  /** Mensaje descriptivo mostrado debajo del ícono */
  description: string;
}

/**
 * Estado vacío genérico para listas de eventos del odontograma.
 * Envuelve el EmptyState atómico Bento para mantener la consistencia
 * visual del módulo (el variant "inline" ya aporta el padding py-12).
 */
export function OdontogramEmptyState({
  description,
}: OdontogramEmptyStateProps) {
  return <EmptyState title={description} variant="inline" />;
}
