"use client";

import { useAuth } from "@/contexts/auth-context";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { SidebarHeader } from "@/components/ui/atomic/navigation/sidebar-header";
import { SidebarSearch } from "@/components/ui/atomic/navigation/sidebar-search";
import { SidebarSection } from "@/components/ui/atomic/navigation/sidebar-section";
import { SidebarNavItem } from "@/components/ui/atomic/navigation/sidebar-nav-item";
import { SidebarFooter } from "@/components/ui/atomic/navigation/sidebar-footer";
import { StorageNotification } from "@/components/ui/atomic/feedback/storage-notification";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { Stethoscope } from "lucide-react";
import { ThemeToggle } from "@/components/ui/atomic/controls/theme-toggle";

interface SidebarProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentPath, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { mainMenuItems, secondaryMenuItems, isActiveRoute } =
    useSidebarNavigation(user?.roleName);

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const getUserName = () => {
    if (!user?.email) return "Usuario";
    const emailParts = user.email.split(String.fromCharCode(64));
    return emailParts[0] || "Usuario";
  };

  const themeToggle = <ThemeToggle variant="ghost" size="sm" />;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto",
          "w-68 lg:w-68",
          "transform transition-transform duration-300 ease-in-out lg:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "bg-gray-100 dark:bg-gray-900",
          "shadow-lg dark:shadow-2xl",
          "transition-colors duration-200"
        )}
      >
        <div className="flex flex-col h-full">
          <SidebarHeader
            title="Sistema Médico"
            icon={Stethoscope}
            actions={themeToggle}
          />

          <SidebarSearch placeholder="Search" />

          <nav className="flex-1 overflow-hidden">
            <SidebarSection className="pb-4 pr-4 mb-16">
              {mainMenuItems.map((item) => (
                <SidebarNavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActiveRoute(currentPath, item.path)}
                  onClick={() => handleNavigation(item.path)}
                />
              ))}
            </SidebarSection>

            <SidebarSection separator className="pb-4">
              {secondaryMenuItems.map((item) => (
                <SidebarNavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActiveRoute(currentPath, item.path)}
                  onClick={() => handleNavigation(item.path)}
                />
              ))}
            </SidebarSection>

            <div className="mt-2">
              <StorageNotification
                usedPercentage={80}
                onDismiss={() => console.log("Dismissed")}
                onUpgrade={() => console.log("Upgrade clicked")}
              />
            </div>
          </nav>

          <SidebarFooter
            userName={getUserName()}
            userEmail={user?.email || ""}
            onLogout={logout}
          />
        </div>
      </aside>
    </>
  );
}
