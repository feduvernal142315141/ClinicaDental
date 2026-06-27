"use client";

import { LogOut, User, LifeBuoy, Settings, ChevronDown } from "lucide-react";
import { UserAvatar } from "@/components/ui/atomic/data-display/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const itemClass =
  "cursor-pointer gap-2 rounded-lg px-3 py-2 text-sm text-ink focus:bg-hover focus:text-ink";

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
    <div className="mt-auto p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-2 rounded-xl px-2 py-1.5 text-ink hover:bg-hover"
          >
            <UserAvatar src={userAvatar} name={userName} size="sm" />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium leading-tight text-ink">
                {userName}
              </p>
              <p className="truncate text-xs leading-tight text-subtle">
                {userEmail}
              </p>
            </div>
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-subtle" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-64 rounded-xl border-hairline bg-surface p-1.5 shadow-bento"
        >
          {/* Cabecera de cuenta */}
          <div className="mb-1 flex items-center gap-3 rounded-lg bg-elevated px-3 py-2.5">
            <UserAvatar src={userAvatar} name={userName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {userName}
              </p>
              <p className="truncate text-xs text-subtle">{userEmail}</p>
            </div>
          </div>

          <DropdownMenuItem className={itemClass} onClick={onProfile}>
            <User className="h-4 w-4 text-subtle" /> Mi Perfil
          </DropdownMenuItem>
          {onSupport && (
            <DropdownMenuItem className={itemClass} onClick={onSupport}>
              <LifeBuoy className="h-4 w-4 text-subtle" /> Soporte
            </DropdownMenuItem>
          )}
          {onSettings && (
            <DropdownMenuItem className={itemClass} onClick={onSettings}>
              <Settings className="h-4 w-4 text-subtle" /> Configuración
            </DropdownMenuItem>
          )}

          <div className="my-1.5 h-px bg-hairline" />

          <DropdownMenuItem
            className="cursor-pointer gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-300"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
