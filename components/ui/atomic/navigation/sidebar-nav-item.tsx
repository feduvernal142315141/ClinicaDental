import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  hasSubmenu?: boolean;
  onClick?: () => void;
}

export function SidebarNavItem({
  icon: Icon,
  label,
  isActive = false,
  hasSubmenu = false,
  onClick,
}: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors rounded-lg mx-2",
        "hover:bg-accent/50 hover:text-accent-foreground",
        isActive
          ? "bg-primary text-primary-foreground hover:bg-primary "
          : "text-[#808080]"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {hasSubmenu && (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </button>
  );
}
