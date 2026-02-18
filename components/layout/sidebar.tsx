"use client";

import { cn } from "@/lib/utils/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { useSidebarNavigation } from "@/lib/hooks/use-sidebar-navigation";
import { SidebarSection } from "@/components/ui/atomic/navigation/sidebar-section";
import { SidebarNavItem } from "@/components/ui/atomic/navigation/sidebar-nav-item";
import { StorageNotification } from "@/components/ui/atomic/feedback/storage-notification";
import { Stethoscope, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";

interface SidebarProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  currentPath,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { mainMenuItems, secondaryMenuItems, isActiveRoute } =
    useSidebarNavigation(user?.roleName);

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar content */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 lg:z-auto",
          "h-full",
          "transform transition-all duration-300 ease-in-out lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "flex flex-col",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        {/* Header with collapse button */}
        <div
          className={cn(
            "flex items-center py-3 transition-all duration-300",
            isCollapsed ? "px-2 justify-center" : "px-4 justify-between",
          )}
        >
          {/* Logo and title with animation */}
          <div
            className={cn(
              "flex items-center gap-3 transition-all duration-300 overflow-hidden",
              isCollapsed ? "w-10 justify-center" : "w-auto",
            )}
          >
            <Stethoscope
              className={cn(
                "shrink-0 text-primary transition-all duration-300",
                isCollapsed ? "h-8 w-8" : "h-6 w-6",
              )}
            />
            <span
              className={cn(
                "font-semibold whitespace-nowrap transition-all duration-300",
                isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto",
              )}
            >
              Sistema Médico
            </span>
          </div>
          {/* Collapse button */}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className={cn(
                "shrink-0 h-8 w-8 transition-all duration-300",
                isCollapsed ? "rotate-0" : "rotate-0",
              )}
              aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              <div className="transition-transform duration-300">
                {isCollapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </div>
            </Button>
          )}
        </div>
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <SidebarSection className="space-y-1">
            {mainMenuItems.map((item) => (
              <SidebarNavItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                isActive={isActiveRoute(currentPath, item.path)}
                onClick={() => handleNavigation(item.path)}
                isCollapsed={isCollapsed}
              />
            ))}
          </SidebarSection>

          {secondaryMenuItems.length > 0 && (
            <SidebarSection separator className="mt-4 pt-4 space-y-1">
              {secondaryMenuItems.map((item) => (
                <SidebarNavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActiveRoute(currentPath, item.path)}
                  onClick={() => handleNavigation(item.path)}
                  isCollapsed={isCollapsed}
                />
              ))}
            </SidebarSection>
          )}
        </nav>

        {/* Storage notification at bottom - animated hide when collapsed */}
        <div
          className={cn(
            "mt-auto px-3 pb-4 transition-all duration-300 overflow-hidden",
            isCollapsed ? "opacity-0 max-h-0 py-0" : "opacity-100 max-h-48",
          )}
        >
          <StorageNotification
            usedPercentage={80}
            onDismiss={() => console.log("Dismissed")}
            onUpgrade={() => console.log("Upgrade clicked")}
          />
        </div>
      </div>
    </>
  );
}
