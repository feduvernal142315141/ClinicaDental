"use client";

import { Toaster } from "sileo";
import { useTheme } from "next-themes";
import "sileo/styles.css";

/**
 * Punto de montaje ÚNICO de Sileo (estándar de mensajería del proyecto).
 *
 * Usamos el diseño NATIVO de Sileo: la burbuja es CONTRASTANTE con el fondo
 * (en tema oscuro la burbuja es clara — como el look oficial; en tema claro,
 * oscura). Por eso NO forzamos `fill`: pisarlo con un color = superficie hacía
 * que la burbuja desapareciera sobre fondos del mismo tono. Solo sincronizamos
 * `theme` con next-themes; el ajuste de copy en español vive en globals.css.
 */
export function SileoToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Toaster
      position="top-center"
      theme={isDark ? "dark" : "light"}
      offset={{ top: 20 }}
      options={{
        duration: 5500,
        roundness: 18,
      }}
    />
  );
}
