"use client";

import { Button } from "@/components/ui/primitives/shadcn/button";
import { LanguageSelector } from "@/components/ui/atomic/navigation/language-selector";
import { ThemeToggle } from "@/components/ui/atomic/controls/theme-toggle";
import { useI18n } from "@/lib/contexts/i18n-context";
import { Bell } from "lucide-react";

interface HeaderActionsProps {
  supportHref?: string;
  settingsHref?: string;
  onNotificationsClick?: () => void;
}

export function HeaderActions({ onNotificationsClick }: HeaderActionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      {/* <Link href={supportHref} className="inline-flex items-center">
        <Button variant="ghost" size="icon" aria-label="Support">
          <HelpIcon className="h-4 w-4" />
        </Button>
      </Link>
      <Link href={settingsHref} className="inline-flex items-center">
        <Button variant="ghost" size="icon" aria-label="Settings">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </Link> */}
      <LanguageSelector />
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("app.notifications")}
        onClick={onNotificationsClick}
      >
        <Bell className="h-4 w-4" />
      </Button>
      <ThemeToggle variant="ghost" size="sm" />
    </div>
  );
}
