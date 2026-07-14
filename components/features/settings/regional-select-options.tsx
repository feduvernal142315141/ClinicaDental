"use client";

import * as React from "react";

import type { SelectOption } from "@/components/ui/controls/select";
import { CURRENCY_SELECT_META } from "@/lib/entity/settings/currency-meta";
import { TIMEZONE_CATALOG } from "@/lib/entity/settings/timezones";

/**
 * Constructores de opciones enriquecidas (bandera + símbolo + subtítulo +
 * searchText) para los Select de "Configuración regional". La capa de entidad
 * (`currency-meta`, `timezones`) queda sin JSX; el arte vive aquí. Todo es JSX
 * de módulo a partir de constantes (emoji/offset fijos) → sin lecturas de
 * `Intl`/locale en render → seguro para hidratación SSR.
 */

/** Símbolo en badge Bento. Solo se usa cuando el símbolo NO es el propio código. */
function SymbolBadge({ symbol }: { symbol: string }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-surface px-1 text-xs font-medium tabular-nums text-ink">
      {symbol}
    </span>
  );
}

/** Ranura de bandera de ancho fijo (estable pinte flag o par de letras). */
function Flag({ emoji }: { emoji: string }) {
  return (
    <span className="inline-flex w-5 justify-center text-base leading-none">
      {emoji}
    </span>
  );
}

/** Opciones de moneda: bandera + (símbolo si difiere del código) + "CÓDIGO · Nombre". */
export const CURRENCY_SELECT_OPTIONS: readonly SelectOption[] =
  CURRENCY_SELECT_META.map((m) => {
    const hasRealSymbol = m.symbol !== m.code;
    return {
      value: m.code,
      label: `${m.code} · ${m.name}`,
      searchText: m.searchText,
      icon: (
        <span className="inline-flex items-center gap-1.5">
          <Flag emoji={m.flag} />
          {hasRealSymbol && <SymbolBadge symbol={m.symbol} />}
        </span>
      ),
    };
  });

/** Opciones de zona horaria: bandera + "País · Ciudad" con subtítulo de offset. */
export const TIMEZONE_SELECT_OPTIONS: readonly SelectOption[] =
  TIMEZONE_CATALOG.map((z) => ({
    value: z.value,
    label: z.label,
    searchText: z.searchText,
    icon: <Flag emoji={z.flag} />,
    description: z.offset,
  }));
