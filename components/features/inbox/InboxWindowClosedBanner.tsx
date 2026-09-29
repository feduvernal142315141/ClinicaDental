"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/utils";

export interface InboxWindowClosedBannerProps {
  className?: string;
}

export function InboxWindowClosedBanner({
  className,
}: InboxWindowClosedBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-hover px-4 py-3",
        className,
      )}
    >
      <Clock className="size-5 shrink-0 text-subtle" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">
          Ventana de respuesta cerrada
        </span>
        <span className="text-xs text-subtle">
          WhatsApp requiere una plantilla aprobada para reanudar la conversación.
        </span>
      </div>
    </div>
  );
}
