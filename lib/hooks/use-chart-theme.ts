"use client";

import { useEffect, useState } from "react";

function readChannel(name: string, fallback: string): string {
  if (typeof window === "undefined") return `rgb(${fallback})`;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return `rgb(${v || fallback})`;
}

/**
 * Tema para gráficos Recharts derivado de los design tokens Bento.
 * Lee los canales CSS (`--hairline`, `--muted-ch`, `--elevated`, `--ink`) y se
 * re-evalúa al cambiar la clase de tema en <html> (claro/oscuro).
 */
export function useChartTheme() {
  const [, force] = useState(0);

  useEffect(() => {
    const obs = new MutationObserver(() => force((n) => n + 1));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  const hairline = readChannel("--hairline", "226 231 240");
  const subtle = readChannel("--muted-ch", "91 102 120");
  const elevated = readChannel("--elevated", "255 255 255");
  const ink = readChannel("--ink", "16 24 38");

  return {
    gridStroke: hairline,
    axisTick: { fill: subtle, fontSize: 11 },
    tooltip: {
      contentStyle: {
        background: elevated,
        border: `1px solid ${hairline}`,
        borderRadius: 12,
        color: ink,
        fontSize: 12,
        boxShadow: "0 10px 30px -18px rgba(0,0,0,0.5)",
      } as React.CSSProperties,
      labelStyle: { color: ink } as React.CSSProperties,
      itemStyle: { color: ink } as React.CSSProperties,
    },
  };
}
