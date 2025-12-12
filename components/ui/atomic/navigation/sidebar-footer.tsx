"use client";

import { LogOut, User, LifeBuoy, Settings } from "lucide-react";
import { UserProfileCard } from "@/components/ui/atomic/data-display/user-profile-card";
import { UserAvatar } from "@/components/ui/atomic/data-display/user-avatar";
import { UserInfo } from "@/components/ui/atomic/data-display/user-info";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import { Button } from "@/components/ui/primitives/shadcn/button";

interface SidebarFooterProps {
  userName: string;
  userEmail: string;
  userAvatar?: string;
  onLogout: () => void;
  onProfile?: () => void;
  onSupport?: () => void;
  onSettings?: () => void;
}

export function SidebarFooter({
  userName,
  userEmail,
  userAvatar,
  onLogout,
  onProfile,
  onSupport,
  onSettings,
}: SidebarFooterProps) {
  return (
    <div className="mt-auto p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <UserAvatar src={userAvatar} name={userName} size="md" />
            <div className="text-left">
              <p className="text-sm font-medium leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
          <DropdownMenuItem className="gap-2" onClick={onProfile}>
            <User className="h-4 w-4" /> Mi Perfil
          </DropdownMenuItem>
          {onSupport && (
            <DropdownMenuItem className="gap-2" onClick={onSupport}>
              <LifeBuoy className="h-4 w-4" /> Soporte
            </DropdownMenuItem>
          )}
          {onSettings && (
            <DropdownMenuItem className="gap-2" onClick={onSettings}>
              <Settings className="h-4 w-4" /> Configuración
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-red-500" />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-700"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
