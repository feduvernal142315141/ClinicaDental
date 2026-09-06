"use client";

import { useEffect, useState } from "react";
import { Check, CloudOff, Loader2 } from "lucide-react";
import { useAutosaveStatus } from "@/lib/store/useAutosaveStatus";
import { cn } from "@/lib/utils/utils";

/**
 * Indicador de autoguardado de la consulta en curso.
 *
 * Se separó de `ActiveConsultationBanner` para que el rediseño pudiera montar la
 * cinta de visita en su lugar SIN perder dos comportamientos que el banner traía
 * y que son fáciles de dejarse por el camino:
 *
 * 1. El `reset()` del store al DESMONTAR. Sin él, un "Error al guardar" de la
 *    consulta anterior se quedaba pegado y aparecía al abrir la siguiente.
 * 2. El guard `mounted`. El store se hidrata en el cliente, así que leerlo en el
 *    primer render produce un desajuste de hidratación (prohibido por CLAUDE.md).
 *
 * Va dentro del `autosaveSlot` de `VisitRibbon`, que solo se monta con una
 * consulta activa: así el ciclo de vida del indicador coincide con el de la
 * consulta y el reset se dispara en el momento correcto.
 */
export function VisitAutosaveIndicator() {
  const { status } = useAutosaveStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => useAutosaveStatus.getState().reset();
  }, []);

  if (!mounted || status === "idle") return null;

  const config = {
    saving: {
      icon: <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />,
      label: "Guardando…",
      className: "text-subtle",
    },
    saved: {
      icon: <Check className="h-3 w-3" />,
      label: "Guardado",
      className: "text-emerald-700 dark:text-emerald-300",
    },
    error: {
      icon: <CloudOff className="h-3 w-3" />,
      label: "Error al guardar",
      className: "text-rose-700 dark:text-rose-300",
    },
  }[status as "saving" | "saved" | "error"];

  if (!config) return null;

  return (
    // `aria-live="polite"`: el autoguardado es justo el tipo de cambio que un
    // usuario con lector de pantalla no puede descubrir mirando.
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
