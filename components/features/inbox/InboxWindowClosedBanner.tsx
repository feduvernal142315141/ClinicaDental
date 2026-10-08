"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useI18n } from "@/lib/contexts/i18n-context";

export interface InboxWindowClosedBannerProps {
  className?: string;
}

export function InboxWindowClosedBanner({
  className,
}: InboxWindowClosedBannerProps) {
  const { t } = useI18n();
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
          {t("inbox.banner.windowClosedTitle")}
        </span>
        <span className="text-xs text-subtle">
          {t("inbox.banner.windowClosedDescription")}
        </span>
      </div>
    </div>
  );
}
