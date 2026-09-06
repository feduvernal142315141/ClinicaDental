"use client";

import { useEffect, useState } from "react";
import { Check, CloudOff, Loader2 } from "lucide-react";
import { useAutosaveStatus } from "@/lib/store/useAutosaveStatus";
import { cn } from "@/lib/utils/utils";

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
