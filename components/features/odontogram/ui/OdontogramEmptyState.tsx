"use client";

import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui";

export interface OdontogramEmptyStateProps {
  /** Línea principal del estado vacío. */
  description: string;
  /** Icono opcional sobre el mensaje. */
  icon?: LucideIcon;
  /** Segunda línea opcional, para la acción sugerida. */
  hint?: string;
}

/**
 * Estado vacío genérico para listas de eventos del odontograma.
 * Envuelve el EmptyState atómico Bento para mantener la consistencia
 * visual del módulo (el variant "inline" ya aporta el padding py-12).
 *
 * `icon` y `hint` existen porque el átomo Bento YA los soporta y este wrapper
 * no los reenviaba: al migrar un estado vacío que tenía icono y segunda línea
 * se perdía contenido, que es un cambio de fondo disfrazado de homogeneización.
 */
export function OdontogramEmptyState({
  description,
  icon,
  hint,
}: OdontogramEmptyStateProps) {
  return (
    <EmptyState
      icon={icon}
      title={description}
      description={hint}
      variant="inline"
    />
  );
}
