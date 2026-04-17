"use client";

import { Card, Tag, Typography } from "antd";
import { Calendar } from "lucide-react";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ReactNode } from "react";

const { Text, Paragraph } = Typography;

export interface OdontogramEventCardProps {
  /** Número del diente, e.g. 11 */
  toothNumber: number;
  /** Superficies afectadas */
  surfaces?: string[];
  /** Nombre visible del evento / procedimiento */
  displayName: string;
  /** Etiqueta del tipo de evento ("Diagnóstico", "Plan", "Realizado") */
  typeLabel: string;
  /** Color semántico del tag AntD */
  tagColor: string;
  /** Notas opcionales */
  notes?: string;
  /** Fecha formateada */
  date: string;
  /** Callback al hacer click en la tarjeta */
  onClick?: () => void;
}

/**
 * Tarjeta de evento clínico para las listas de Diagnósticos / Planes / Realizados.
 * Reemplaza la composición Card+Badge de shadcn.
 */
export function OdontogramEventCard({
  toothNumber,
  surfaces = [],
  displayName,
  typeLabel,
  tagColor,
  notes,
  date,
  onClick,
}: OdontogramEventCardProps) {
  return (
    <Card
      hoverable
      size="small"
      onClick={onClick}
      className="cursor-pointer mb-3"
      styles={{ body: { padding: "12px 16px", marginBottom: "12px" } }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="space-y-0.5">
          <Text strong className="text-lg">
            Diente {toothNumber}
          </Text>
          {surfaces.length > 0 && (
            <Paragraph type="secondary" className="!mb-0 text-sm">
              Superficies: {surfaces.join(", ")}
            </Paragraph>
          )}
        </div>
        <Tag color={tagColor}>{typeLabel}</Tag>
      </div>

      <div className="space-y-1">
        <Text className="font-medium">{displayName}</Text>
        {notes && (
          <Paragraph type="secondary" className="!mb-0 text-sm">
            {notes}
          </Paragraph>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
        </div>
      </div>
    </Card>
  );
}
