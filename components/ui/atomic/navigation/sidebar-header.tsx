import { LucideIcon } from "lucide-react";
import { LogoIcon } from "@/components/ui/atomic/branding/logo-icon";

interface SidebarHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
}

export function SidebarHeader({
  title,
  subtitle,
  badge,
  icon,
}: SidebarHeaderProps) {
  return (
    <div className="px-6 py-4 mb-4">
      <div className="flex items-center gap-3 mb-2">
        <LogoIcon icon={icon} size="md" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      {badge && (
        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
          {badge}
        </span>
      )}
    </div>
  );
}
