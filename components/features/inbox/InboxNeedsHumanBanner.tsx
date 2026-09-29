"use client";

import * as React from "react";
import { AlertTriangle, Hand } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/primitives/shadcn/button";

export interface InboxNeedsHumanBannerProps {
  onTakeover: () => void;
  className?: string;
}

export function InboxNeedsHumanBanner({
  onTakeover,
  className,
}: InboxNeedsHumanBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-amber-500/15 px-4 py-3",
        className,
      )}
    >
      <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          Requiere atención
        </span>
        <span className="text-xs text-amber-600 dark:text-amber-400">
          Dalia transfirió esta conversación al equipo.
        </span>
      </div>
      <Button type="button" size="sm" onClick={onTakeover}>
        <Hand className="size-4 mr-1" />
        Tomar conversación
      </Button>
    </div>
  );
}
