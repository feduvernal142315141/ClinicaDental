/**
 * SUMMARY CARD ATOMIC COMPONENT
 *
 * Componente atómico reutilizable para mostrar resúmenes de información
 * en formato de lista clave-valor dentro de una Card
 */

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { cn } from "@/lib/utils/utils";

// ============================================
// TYPES
// ============================================

export interface SummaryItem {
  /** Etiqueta/label del campo (ej: "Paciente", "Fecha") */
  label: string;

  /** Valor a mostrar */
  value: string | number | null | undefined;

  /** Valor por defecto si value es null/undefined */
  defaultValue?: string;

  /** Función opcional para formatear el valor */
  formatter?: (value: string | number) => string;

  /** Ocultar el item si el valor es null/undefined */
  hideIfEmpty?: boolean;
}

interface SummaryCardProps {
  /** Título de la card */
  title: string;

  /** Array de items a mostrar */
  items: SummaryItem[];

  /** Descripción opcional del header */
  description?: string;

  /** Clases CSS adicionales para el contenido */
  contentClassName?: string;

  /** Clases CSS adicionales para la card */
  className?: string;
}

// ============================================
// SUMMARY CARD
// ============================================

/**
 * Card de resumen con lista de información clave-valor
 *
 * @example
 * <SummaryCard
 *   title="Resumen de la cita"
 *   items={[
 *     { label: "Paciente", value: patient.name, defaultValue: "No seleccionado" },
 *     { label: "Fecha", value: appointment.date, defaultValue: "—" },
 *     {
 *       label: "Duración",
 *       value: appointment.duration,
 *       formatter: (val) => `${val} min`,
 *       defaultValue: "30 min"
 *     }
 *   ]}
 * />
 */
export function SummaryCard({
  title,
  items,
  description,
  contentClassName,
  className,
}: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className={cn("space-y-2 text-sm", contentClassName)}>
        {items.map((item, index) => {
          // Si hideIfEmpty está activo y no hay valor, no mostrar
          if (item.hideIfEmpty && !item.value) {
            return null;
          }

          // Determinar el valor a mostrar
          let displayValue: string;

          if (
            item.value === null ||
            item.value === undefined ||
            item.value === ""
          ) {
            displayValue = item.defaultValue ?? "—";
          } else if (item.formatter) {
            displayValue = item.formatter(item.value);
          } else {
            displayValue = String(item.value);
          }

          return (
            <p key={index}>
              <strong>{item.label}:</strong> {displayValue}
            </p>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================
// HELPER: CREATE SUMMARY ITEMS
// ============================================

/**
 * Helper para crear items de resumen con tipado fuerte
 *
 * @example
 * const items = createSummaryItems([
 *   { label: "Paciente", value: formData.patientName },
 *   { label: "Fecha", value: formData.date }
 * ]);
 */
export function createSummaryItems(items: SummaryItem[]): SummaryItem[] {
  return items;
}
