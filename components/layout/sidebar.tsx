"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { useClinicBranding } from "@/lib/contexts/clinic-branding-context";
import { useSidebarNavigation } from "@/lib/hooks/use-sidebar-navigation";
import { SidebarSection } from "@/components/ui/atomic/navigation/sidebar-section";
import { SidebarNavItem } from "@/components/ui/atomic/navigation/sidebar-nav-item";
import { Activity, ChevronsLeft, ChevronsRight } from "lucide-react";

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
  const { name: clinicName, logoUrl } = useClinicBranding();
  const router = useRouter();
  const { mainMenuItems, secondaryMenuItems, isActiveRoute } =
    useSidebarNavigation(user?.roleName);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const toggleGroup = (path: string) =>
    setOpenGroups((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );

  // Un grupo está abierto si el usuario lo abrió o si alguna ruta hija está activa.
  const isGroupOpen = (item: (typeof mainMenuItems)[number]) =>
    openGroups.includes(item.path) ||
    (item.children?.some((c) => isActiveRoute(currentPath, c.path)) ?? false);

  const renderItem = (item: (typeof mainMenuItems)[number]) => {
    if (item.children?.length) {
      const open = isGroupOpen(item);
      const parentActive = isActiveRoute(currentPath, item.path);
      const submenuId = `submenu-${item.path}`;
      return (
        <div key={item.path}>
          <SidebarNavItem
            icon={item.icon}
            label={item.label}
            hasSubmenu
            isOpen={open}
            isActive={parentActive && (isCollapsed || !open)}
            isCollapsed={isCollapsed}
            onClick={() =>
              isCollapsed ? handleNavigation(item.path) : toggleGroup(item.path)
            }
          />
          {/* Submenú siempre montado: colapsa con el truco grid 0fr → 1fr
              (height auto fluido, sin "salto"). El padding vertical va dentro
              del contenedor clipado para que pueda colapsar a 0. */}
          <div
            id={submenuId}
            data-open={open && !isCollapsed}
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-emphasized motion-reduce:transition-none",
              "grid-rows-[0fr] data-[open=true]:grid-rows-[1fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="mt-1 ml-5 space-y-1 border-l border-hairline pl-2">
                {item.children.map((child) => (
                  <SidebarNavItem
                    key={child.path}
                    icon={child.icon}
                    label={child.label}
                    isActive={isActiveRoute(currentPath, child.path)}
                    isCollapsed={false}
                    onClick={() => handleNavigation(child.path)}
                    className="h-9 text-[13px]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <SidebarNavItem
        key={item.path}
        icon={item.icon}
        label={item.label}
        isActive={isActiveRoute(currentPath, item.path)}
        onClick={() => handleNavigation(item.path)}
        isCollapsed={isCollapsed}
      />
    );
  };

  return (
    <>
      {/* Velo móvil tokenizado + fundido suave */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in-0 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Panel del sidebar. En móvil es un drawer (w-64 fijo, slide-in); en
          desktop rellena el <aside> (w-full) que controla el ancho/colapso. */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full lg:static lg:z-auto",
          "flex flex-col",
          "w-64 lg:w-full",
          "transform transition-transform duration-300 ease-emphasized motion-reduce:transition-none lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Fondo propio en móvil (drawer); en desktop lo provee el <aside>.
          "border-r border-hairline bg-surface lg:border-0 lg:bg-transparent",
        )}
      >
        {/* Header: marca + control de colapso */}
        <div
          className={cn(
            "flex border-b border-hairline transition-all duration-300 ease-emphasized",
            isCollapsed
              ? "flex-col items-center gap-2 px-2 py-3"
              : "h-16 items-center justify-between gap-2 px-3",
          )}
        >
          {/* Marca: isotipo (siempre) + wordmark con grid-fade */}
          <div
            className={cn(
              "flex min-w-0 items-center",
              isCollapsed ? "justify-center gap-0" : "gap-3",
            )}
          >
            <div
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-2xl text-white",
                !logoUrl && "bg-gradient-to-br from-brand to-brand-strong",
                !logoUrl && "shadow-[0_4px_14px_-4px_rgb(var(--brand)/0.55)]",
              )}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={`Logo de ${clinicName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Activity className="h-[18px] w-[18px]" strokeWidth={2.5} />
              )}
            </div>
            <div
              className={cn(
                "grid transition-[grid-template-columns,opacity] duration-300 ease-emphasized motion-reduce:transition-none",
                isCollapsed ? "grid-cols-[0fr] opacity-0" : "grid-cols-[1fr] opacity-100",
              )}
            >
              <div className="overflow-hidden">
                <p className="truncate text-sm font-semibold leading-tight text-ink">
                  {clinicName}
                </p>
                <p className="truncate text-[11px] leading-tight text-subtle">
                  Gestión clínica
                </p>
              </div>
            </div>
          </div>

          {/* Botón colapsar/expandir (nativo, tokens Bento — sin antd) */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-subtle",
                "transition-colors duration-200 hover:bg-hover hover:text-ink",
                "outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              )}
            >
              {isCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navegación */}
        <nav
          aria-label="Navegación principal"
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 [contain:layout_paint]"
        >
          <SidebarSection className="space-y-1">
            {mainMenuItems.map(renderItem)}
          </SidebarSection>

          {secondaryMenuItems.length > 0 && (
            <SidebarSection separator className="mt-4 space-y-1 pt-4">
              {secondaryMenuItems.map(renderItem)}
            </SidebarSection>
          )}
        </nav>
      </div>
    </>
  );
}
