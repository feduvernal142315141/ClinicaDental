"use client";

import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/ui/atomic/branding/brand-mark";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { useClinicBranding } from "@/lib/contexts/clinic-branding-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { ThemeToggle } from "@/components/ui/atomic/controls/theme-toggle";
import { LanguageSelector } from "@/components/ui/atomic/navigation/language-selector";
import { SidebarFooter } from "@/components/ui/atomic/navigation/sidebar-footer";

interface MobileHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

/**
 * Header móvil (`<lg`). Estructura estándar: acción de menú + marca de la clínica
 * a la izquierda; tema + menú de cuenta a la derecha. El nombre/logo salen de
 * `useClinicBranding` (no hardcodeados) y el email/rol viven dentro del menú de
 * cuenta (`SidebarFooter` compacto), que además da acceso a Perfil y Cerrar sesión
 * en móvil.
 */
export function MobileHeader({
  isSidebarOpen,
  onToggleSidebar,
}: MobileHeaderProps) {
  const { user, logout } = useAuth();
  const { name: clinicName, logoUrl } = useClinicBranding();
  const { t } = useI18n();
  const router = useRouter();

  const userName = user?.email
    ? user.email.split(String.fromCharCode(64))[0] || t("app.user.fallback")
    : t("app.user.fallback");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-hairline bg-surface/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden">
      {/* Izquierda: botón de menú + marca de la clínica */}
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={
            isSidebarOpen ? t("navigation.closeMenu") : t("navigation.openMenu")
          }
          aria-expanded={isSidebarOpen}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo de ${clinicName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <BrandMark rounded={false} className="h-full w-full" />
            )}
          </div>
          <p className="truncate text-sm font-semibold leading-tight text-ink">
            {clinicName}
          </p>
        </div>
      </div>

      {/* Derecha: tema + menú de cuenta (avatar → Perfil / Cerrar sesión) */}
      <div className="flex shrink-0 items-center gap-0.5">
        <LanguageSelector className="w-[88px]" />
        <ThemeToggle variant="ghost" size="sm" />
        <SidebarFooter
          compact
          userName={userName}
          userEmail={user?.email || ""}
          onLogout={logout}
          onProfile={() => router.push("/settings/profile")}
          onSupport={() => router.push("/support")}
        />
      </div>
    </header>
  );
}
