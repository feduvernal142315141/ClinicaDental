"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";

/**
 * Paleta de gráficos del dashboard, ligada al tema activo (next-themes).
 *
 * recharts pinta con colores CONCRETOS (no resuelve `var(--token)` en atributos
 * SVG), por eso devolvemos valores por tema en vez de clases Tailwind. Los
 * colores son mirrors/derivados de los tokens Bento (surface/elevated/hairline/
 * ink) y una serie categórica cohesiva — calma y equilibrada como referencia,
 * con strokes algo más brillantes en oscuro para contraste.
 *
 *   const c = useChartPalette();
 *   <Area stroke={c.brand} fill="url(#g)" />
 *   <CartesianGrid stroke={c.grid} />
 */
export interface ChartPalette {
  brand: string;
  success: string;
  warning: string;
  danger: string;
  accent: string; // naranja
  violet: string;
  /** Serie categórica en orden estable (usar por índice). */
  series: string[];
  grid: string; // líneas de cuadrícula
  axis: string; // texto y ticks de ejes
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  isDark: boolean;
}

export function useChartPalette(): ChartPalette {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return useMemo<ChartPalette>(() => {
    const brand = isDark ? "#3B82F6" : "#2563EB";
    const success = isDark ? "#34D399" : "#10B981";
    const warning = isDark ? "#FBBF24" : "#F59E0B";
    const danger = isDark ? "#F87171" : "#EF4444";
    const accent = isDark ? "#FB923C" : "#F97316";
    const violet = isDark ? "#A78BFA" : "#7C3AED";

    return {
      brand,
      success,
      warning,
      danger,
      accent,
      violet,
      series: [brand, success, warning, accent, violet, danger],
      grid: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)",
      axis: isDark ? "rgba(232,236,243,0.55)" : "rgba(16,24,38,0.55)",
      tooltipBg: isDark ? "#161D29" : "#FFFFFF", // --elevated
      tooltipBorder: isDark ? "#1F2A38" : "#E2E7F0", // --hairline
      tooltipText: isDark ? "#E8ECF3" : "#101826", // --ink
      isDark,
    };
  }, [isDark]);
}
