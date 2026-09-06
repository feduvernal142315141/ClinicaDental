"use client";

import * as React from "react";
import { Pencil } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage, Button } from "@/components/ui";
import { formatDate } from "@/lib/entity/patients";
import type {
  AlertSeverity,
  ClinicalHistoryAlert,
} from "@/lib/entity/clinical-history";
import { cn } from "@/lib/utils/utils";

/**
 * PatientRecordHeader — cabecera contextual del expediente del paciente.
 *
 * Presentacional **puro**: no hace fetch, no lee stores ni `localStorage`.
 * Todo entra por props para que el host decida qué datos hay y qué acciones
 * se permiten.
 *
 * Notas de diseño que no son cosméticas:
 * - `canEdit` es `false` por defecto: un default permisivo en una cabecera
 *   clínica es un fallo de seguridad, no una comodidad.
 * - Los chips de alerta se recortan a tres y se ordenan por severidad, de modo
 *   que una alergia (`critical`) nunca queda fuera del corte por culpa de
 *   cinco medicamentos informativos.
 * - `alert.message` es una FRASE emitida por el backend ("Alergia: Penicilina"),
 *   no una etiqueta corta: se trunca visualmente y el texto íntegro va en
 *   `title` para el hover.
 */
export interface PatientRecordHeaderProps {
  name: string;
  photoUrl?: string | null;
  age?: number;
  gender?: string;
  /** Fecha de nacimiento en formato "YYYY-MM-DD". */
  birthDate?: string;
  phone?: string;
  email?: string;
  alerts?: ClinicalHistoryAlert[];
  /** Por defecto FALSE: sin permiso explícito no se ofrece editar. */
  canEdit?: boolean;
  onEdit?: () => void;
  /** Acción principal a la derecha. La resuelve el host; aquí solo se pinta. */
  primaryAction?: React.ReactNode;
}

/**
 * Forma común de los tags de alerta: píldora pequeña y de bajo contraste, para
 * que acompañen al nombre sin convertirse en el elemento dominante de la
 * cabecera.
 */
const ALERT_TAG_BASE =
  "inline-block max-w-[12rem] truncate rounded-full px-2 py-0.5 text-[11px] font-medium";

/**
 * Severidad del backend → color del tag.
 *
 * Se escriben a mano con utilidades Tailwind y SIEMPRE con su variante `dark:`
 * porque el sistema Bento **no tiene** tokens `success`/`warning`/`danger`: los
 * únicos tokens semánticos son los de superficie/marca. `info` es
 * deliberadamente neutro (tokens `bg-hover`/`border-hairline`) para que no
 * compita visualmente con una alergia.
 */
const ALERT_TAG_CLASS: Record<AlertSeverity, string> = {
  critical:
    "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
  warning:
    "bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
  info: "bg-hover text-subtle border border-hairline",
};

/** Orden de recorte: lo grave primero. */
const ALERT_WEIGHT: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const MAX_VISIBLE_ALERTS = 3;

/** Objetivo táctil de 44px en pantallas de dedo, 40px con ratón. */
const COARSE_TOUCH = "[@media(pointer:coarse)]:h-11";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]?.[0] ?? "";
  const second = words.length > 1 ? (words[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

function formatAge(age: number): string {
  return age === 1 ? "1 año" : `${age} años`;
}

export function PatientRecordHeader({
  name,
  photoUrl,
  age,
  gender,
  birthDate,
  phone,
  email,
  alerts,
  canEdit = false,
  onEdit,
  primaryAction,
}: PatientRecordHeaderProps) {
  // Los campos vacíos se descartan ANTES de renderizar: así los separadores
  // "·" se pintan entre elementos reales y nunca queda uno huérfano.
  const metaItems = React.useMemo(() => {
    const birthLabel = birthDate ? formatDate(birthDate) : "";
    return [
      typeof age === "number" && Number.isFinite(age) ? formatAge(age) : "",
      gender?.trim() ?? "",
      birthLabel,
      phone?.trim() ?? "",
      email?.trim() ?? "",
    ].filter((item): item is string => item.length > 0);
  }, [age, gender, birthDate, phone, email]);

  const { visibleAlerts, hiddenAlerts } = React.useMemo(() => {
    const sorted = [...(alerts ?? [])].sort(
      (a, b) => ALERT_WEIGHT[a.severity] - ALERT_WEIGHT[b.severity],
    );
    return {
      visibleAlerts: sorted.slice(0, MAX_VISIBLE_ALERTS),
      hiddenAlerts: sorted.slice(MAX_VISIBLE_ALERTS),
    };
  }, [alerts]);

  const initials = getInitials(name);

  return (
    <section className="bento w-full p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Avatar className="size-12 shrink-0 sm:size-14">
            {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
            <AvatarFallback className="bg-hover text-sm font-semibold text-ink">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="min-w-0 break-words text-xl font-semibold text-ink">
                {name}
              </h1>

              {visibleAlerts.map((alert) => (
                <span
                  key={alert.id}
                  className={cn(ALERT_TAG_BASE, ALERT_TAG_CLASS[alert.severity])}
                  title={alert.message}
                >
                  {alert.message}
                </span>
              ))}

              {hiddenAlerts.length > 0 ? (
                <span
                  className={cn(ALERT_TAG_BASE, ALERT_TAG_CLASS.info)}
                  title={hiddenAlerts.map((a) => a.message).join("\n")}
                >
                  {`+${hiddenAlerts.length}`}
                </span>
              ) : null}
            </div>

            {metaItems.length > 0 ? (
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-subtle">
                {metaItems.map((item, index) => (
                  <React.Fragment key={`${item}-${index}`}>
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-subtle/60">
                        ·
                      </span>
                    ) : null}
                    <span className="break-all">{item}</span>
                  </React.Fragment>
                ))}
              </p>
            ) : null}
          </div>
        </div>

        {canEdit || primaryAction ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                onClick={onEdit}
                className={cn(COARSE_TOUCH)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </Button>
            ) : null}
            {primaryAction}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default PatientRecordHeader;
