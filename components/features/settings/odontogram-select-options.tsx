"use client";

import * as React from "react";

import type { SelectOption } from "@/components/ui/controls/select";
import { TOOTH_NOTATION_CATALOG } from "@/lib/entity/settings/tooth-notations";
import { ToothNotationLabel } from "@/lib/odontogram/notation";

/**
 * Constructor de opciones enriquecidas para el Select de nomenclatura dental.
 * Mismo reparto que `regional-select-options`: la capa de entidad
 * (`tooth-notations`) queda sin JSX y el arte vive aquí. Todo es JSX de módulo
 * a partir de constantes (el FDI de muestra es fijo) → sin lecturas de
 * `Intl`/locale ni de estado en render → seguro para hidratación SSR.
 */

/**
 * Pieza de muestra: la 16 (primer molar superior derecho). Es la que mejor
 * separa las tres notaciones — FDI 16 · Universal 3 · Palmer 6 con corchete —
 * y la misma que usa la documentación del plan, así que la doctora ve la
 * diferencia real dentro del propio desplegable antes de elegir.
 */
const SAMPLE_FDI = 16;

/**
 * Ranura de muestra de ancho fijo, para que las tres filas alineen su rótulo
 * pese a que "16" ocupa más que "3" y el corchete Palmer añade padding.
 */
function NotationSample({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-8 justify-center text-sm font-semibold tabular-nums text-ink">
      {children}
    </span>
  );
}

/**
 * Opciones de nomenclatura: muestra en vivo de la pieza 16 + rótulo con
 * subtítulo explicativo. Sólo son tres → el Select NO se declara `searchable`;
 * el `searchText` del catálogo viaja igualmente por si la lista crece.
 *
 * La muestra es decorativa: `Select` envuelve el `icon` en un contenedor
 * `aria-hidden`, así que quien use lector de pantalla se orienta por el
 * `label` y la `description`, que ya identifican la notación sin ambigüedad.
 */
export const TOOTH_NOTATION_SELECT_OPTIONS: readonly SelectOption[] =
  TOOTH_NOTATION_CATALOG.map((n) => ({
    value: n.value,
    label: n.label,
    searchText: n.searchText,
    description: n.description,
    icon: (
      <NotationSample>
        <ToothNotationLabel fdi={SAMPLE_FDI} notation={n.value} />
      </NotationSample>
    ),
  }));
