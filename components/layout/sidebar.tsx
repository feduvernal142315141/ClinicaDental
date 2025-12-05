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

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto",
          "w-68 lg:w-68 bg-background",
          "transform transition-transform duration-300 ease-in-out lg:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "bg-[#eeeeee]",
          "shadow-[0px_0px_69px_-42px_rgba(0,0,0,0.75)]"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SidebarHeader title="Sistema Médico" icon={Stethoscope} />

          {/* Search */}
          <SidebarSearch placeholder="Search" />

          {/* Main Navigation */}
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

            {/* Secondary Navigation */}
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

            {/* Storage Notification */}
            <div className="mt-2">
              <StorageNotification
                usedPercentage={80}
                onDismiss={() => console.log("Dismissed")}
                onUpgrade={() => console.log("Upgrade clicked")}
              />
            </div>
          </nav>

          {/* Footer */}
          <SidebarFooter
            userName={user?.email?.split("@")[0] || "Usuario"}
            userEmail={user?.email || ""}
            onLogout={logout}
          />
        </div>
      </aside>
    </>
  );
}
