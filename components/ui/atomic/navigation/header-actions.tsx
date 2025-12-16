"use client";

import Link from "next/link";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { ThemeToggle } from "@/components/ui/atomic/controls/theme-toggle";
import {
  LifeBuoy as HelpIcon,
  Settings as SettingsIcon,
  Bell,
} from "lucide-react";

interface HeaderActionsProps {
  supportHref?: string;
  settingsHref?: string;
  onNotificationsClick?: () => void;
}

export function HeaderActions({
  supportHref = "/support",
  settingsHref = "/settings",
  onNotificationsClick,
}: HeaderActionsProps) {
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
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={onNotificationsClick}
      >
        <Bell className="h-4 w-4" />
      </Button>
      <ThemeToggle variant="ghost" size="sm" />
    </div>
  );
}
