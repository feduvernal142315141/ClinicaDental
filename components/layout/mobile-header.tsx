"use client";

import { Button } from "@/components/ui/primitives/shadcn/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ui/atomic/controls/theme-toggle";

interface MobileHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function MobileHeader({
  isSidebarOpen,
  onToggleSidebar,
}: MobileHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between transition-colors">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="p-2"
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-primary">Sistema Médico</h1>
        </div>
        <ThemeToggle size="sm" className="ml-2" />
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{user?.email}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {user?.roleName}
        </p>
      </div>
    </header>
  );
}
