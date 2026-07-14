"use client";

import { HeaderActions } from "@/components/ui/atomic/navigation/header-actions";
import { SidebarFooter } from "@/components/ui/atomic/navigation/sidebar-footer";
import { useAuth } from "@/lib/contexts/auth-context";
import { useRouter } from "next/navigation";

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const getUserName = () => {
    if (!user?.email) return "Usuario";
    const emailParts = user.email.split(String.fromCharCode(64));
    return emailParts[0] || "Usuario";
  };

  return (
    <header className="hidden lg:flex h-16 items-center justify-end gap-4 border-b border-hairline bg-surface px-4 lg:px-6">
      <div className="flex items-center justify-end gap-2">
        <HeaderActions supportHref="/support" settingsHref="/settings" />
        <SidebarFooter
          userName={getUserName()}
          userEmail={user?.email || ""}
          onLogout={logout}
          onProfile={() => router.push("/settings/profile")}
          onSupport={() => router.push("/support")}
        />
      </div>
    </header>
  );
}
