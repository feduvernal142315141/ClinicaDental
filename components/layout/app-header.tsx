"use client";

import { SidebarHeader } from "@/components/ui/atomic/navigation/sidebar-header";
import { SidebarSearch } from "@/components/ui/atomic/navigation/sidebar-search";
import { ThemeToggle } from "@/components/ui/atomic/controls/theme-toggle";
import { Stethoscope, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { SidebarFooter } from "@/components/ui/atomic/navigation/sidebar-footer";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  supportHref?: string;
}

export function AppHeader({ supportHref = "/support" }: AppHeaderProps) {
  const themeToggle = <ThemeToggle variant="ghost" size="sm" />;
  const { user, logout } = useAuth();
  const router = useRouter();

  const getUserName = () => {
    if (!user?.email) return "Usuario";
    const emailParts = user.email.split(String.fromCharCode(64));
    return emailParts[0] || "Usuario";
  };

  return (
    <header className="hidden lg:flex items-center justify-between gap-4 px-4 lg:px-6 py-1 border-b bg-background">
      <div className="flex items-center gap-3">
        <SidebarHeader title="Sistema Médico" icon={Stethoscope} />
      </div>

      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-md">
          <SidebarSearch placeholder="Search" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        {themeToggle}
        <SidebarFooter
          userName={getUserName()}
          userEmail={user?.email || ""}
          onLogout={logout}
          onProfile={() => router.push("/authenticated/settings")}
          onSupport={() => router.push("/authenticated/support")}
          onSettings={() => router.push("/authenticated/settings")}
        />
      </div>
    </header>
  );
}
