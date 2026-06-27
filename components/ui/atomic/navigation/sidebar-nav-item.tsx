import { LucideIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";

interface SidebarNavItemProps {
  icon?: LucideIcon;
  label: string;
  isActive?: boolean;
  hasSubmenu?: boolean;
  /** Estado abierto del grupo (rota el chevron). */
  isOpen?: boolean;
  onClick?: () => void;
  isCollapsed?: boolean;
  className?: string;
}

export function SidebarNavItem({
  icon: Icon,
  label,
  isActive = false,
  hasSubmenu = false,
  isOpen = false,
  onClick,
  isCollapsed = false,
  className,
}: SidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      aria-label={label}
      className={cn(
        "group flex w-full items-center rounded-xl text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        isActive
          ? "bg-brand text-white shadow-sm"
          : "text-subtle hover:bg-hover hover:text-ink",
        isCollapsed
          ? "h-11 w-11 mx-auto justify-center px-0"
          : "gap-3 px-3 py-2.5",
        className,
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "shrink-0",
            isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
          )}
        />
      )}
      {!isCollapsed && (
        <span className="flex-1 truncate text-left">{label}</span>
      )}
      {hasSubmenu && !isCollapsed && (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      )}
    </button>
  );
}
