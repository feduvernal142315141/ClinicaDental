import { LucideIcon } from "lucide-react";
import { LogoIcon } from "@/components/ui/atomic/branding/logo-icon";
import { ReactNode } from "react";

interface SidebarHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function SidebarHeader({
  title,
  subtitle,
  badge,
  icon,
  actions,
}: SidebarHeaderProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <LogoIcon icon={icon} size="md" className="shrink-0" />
          <h2 className="text-lg font-semibold dark:text-white whitespace-nowrap">
            {title}
          </h2>
        </div>
        {actions && (
          <div className="flex justify-end items-center gap-4 shrink-2">{actions}</div>
        )}
      </div>
      {subtitle && (
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          {subtitle}
        </p>
      )}
      {badge && (
        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary">
          {badge}
        </span>
      )}
    </div>
  );
}
