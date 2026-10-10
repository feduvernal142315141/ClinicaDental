"use client";

import * as React from "react";
import { AlertTriangle, Hand } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useAssistantText } from "@/lib/contexts/assistant-name-context";

export interface InboxNeedsHumanBannerProps {
  onTakeover: () => void;
  className?: string;
}

export function InboxNeedsHumanBanner({
  onTakeover,
  className,
}: InboxNeedsHumanBannerProps) {
  const { t } = useI18n();
  const { withAssistant } = useAssistantText();
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
          {t("inbox.status.needsHuman")}
        </span>
        <span className="text-xs text-amber-600 dark:text-amber-400">
          {withAssistant(t("inbox.banner.needsHumanDescription"))}
        </span>
      </div>
      <Button type="button" size="sm" onClick={onTakeover}>
        <Hand className="size-4 mr-1" />
        {t("inbox.action.takeover")}
      </Button>
    </div>
  );
}
