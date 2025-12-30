import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/primitives/shadcn/button";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  hasSubmenu?: boolean;
  onClick?: () => void;
  isCollapsed?: boolean;
}

export function SidebarNavItem({
  icon: Icon,
  label,
  isActive = false,
  hasSubmenu = false,
  onClick,
  isCollapsed = false,
}: SidebarNavItemProps) {
  return (
    <Button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      aria-label={isCollapsed ? label : undefined}
      type="text"
      block
      className={cn(
        "flex items-center text-sm font-medium rounded-lg",
        "transition-all duration-300 ease-in-out",
        "hover:bg-accent/50 hover:text-accent-foreground dark:hover:bg-gray-800",
        isActive
          ? "bg-primary text-primary-foreground hover:bg-primary dark:bg-primary dark:text-primary-foreground"
          : "text-[#808080] dark:text-gray-400",
        isCollapsed
          ? "w-12 h-12 justify-center mx-auto px-0"
          : "w-full gap-3 px-6 py-3 mx-2"
      )}
    >
      <Icon
        className={cn(
          "shrink-0 transition-all duration-300",
          isCollapsed ? "h-6 w-6" : "h-5 w-5"
        )}
      />
      <span
        className={cn(
          "flex-1 text-left whitespace-nowrap transition-all duration-300 overflow-hidden",
          isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}
      >
        {label}
      </span>
      {hasSubmenu && !isCollapsed && (
        <svg
          className="h-4 w-4 shrink-0 transition-opacity duration-300"
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
    </Button>
  );
}
