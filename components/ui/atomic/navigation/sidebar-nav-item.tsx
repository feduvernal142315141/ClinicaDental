import { LucideIcon, ChevronDown } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/utils";

interface SidebarNavItemProps {
  icon?: LucideIcon;
  label: string;
  isActive?: boolean;
  hasSubmenu?: boolean;
  /** Estado abierto del grupo (rota el chevron). */
  isOpen?: boolean;
  onClick?: () => void;
  isCollapsed?: boolean;
  className?: string;
}

export function SidebarNavItem({
  icon: Icon,
  label,
  isActive = false,
  hasSubmenu = false,
  isOpen = false,
  onClick,
  isCollapsed = false,
  className,
}: SidebarNavItemProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      data-active={isActive}
      data-collapsed={isCollapsed}
      // El nombre accesible ya lo aporta el texto del label (presente en el DOM
      // aunque esté clipado en modo rail). Solo reforzamos en colapsado.
      aria-label={isCollapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      // Solo es disclosure cuando hay submenú y el rail está expandido; colapsado
      // el click navega al índice del grupo, no expande.
      aria-expanded={hasSubmenu && !isCollapsed ? isOpen : undefined}
      className={cn(
        "group/navitem relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-xl px-3 text-sm font-medium",
        "transition-[background-color,color,transform] duration-200 ease-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "motion-safe:active:scale-[0.98]",
        // Inactivo: chrome en neutros Bento.
        "text-subtle hover:bg-hover hover:text-ink",
        // Activo Bento: tinte suave + texto de marca + peso, NO relleno sólido.
        "data-[active=true]:bg-brand/10 data-[active=true]:font-semibold data-[active=true]:text-brand",
        "data-[active=true]:hover:bg-brand/15",
        // Rail colapsado: icono centrado, sin gap/padding lateral.
        "data-[collapsed=true]:justify-center data-[collapsed=true]:gap-0 data-[collapsed=true]:px-0",
        className,
      )}
    >
      {/* Barra de acento izquierda — segundo cue accesible (no depende del color
          solo). Anima con scale-y al activarse/desactivarse el mismo botón. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-brand",
          isCollapsed ? "h-5" : "h-6",
          "origin-center scale-y-0 opacity-0",
          "transition-[transform,opacity] duration-300 ease-emphasized motion-reduce:transition-none",
          "group-data-[active=true]/navitem:scale-y-100 group-data-[active=true]/navitem:opacity-100",
        )}
      />

      {Icon && (
        <Icon
          className={cn(
            "shrink-0 transition-transform duration-200 ease-out",
            "motion-safe:group-hover/navitem:scale-110 motion-safe:group-active/navitem:scale-95",
            isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
          )}
        />
      )}

      {/* Label con grid-fade (1fr → 0fr): se recorta sin reflujo ni "salto". */}
      <span
        className={cn(
          "grid min-w-0 text-left",
          "transition-[grid-template-columns,opacity] duration-300 ease-emphasized motion-reduce:transition-none",
          isCollapsed
            ? "flex-none grid-cols-[0fr] opacity-0"
            : "flex-1 grid-cols-[1fr] opacity-100",
        )}
      >
        <span className="overflow-hidden truncate whitespace-nowrap">
          {label}
        </span>
      </span>

      {hasSubmenu && (
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-subtle",
            "transition-[transform,opacity] duration-300 ease-emphasized motion-reduce:transition-none",
            "group-data-[active=true]/navitem:text-brand",
            isOpen && "rotate-180",
            isCollapsed && "w-0 opacity-0",
          )}
        />
      )}
    </button>
  );

  // Árbol ESTABLE: el <button> nunca se remonta al togglear el rail, así que
  // preserva el foco de teclado y dispara las transiciones (label grid-fade,
  // barra de acento, escala del icono). El tooltip Radix solo tiene contenido
  // en colapsado → en expandido el trigger existe pero no muestra nada.
  return (
    <TooltipPrimitive.Provider delayDuration={0} disableHoverableContent>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
        {isCollapsed && (
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side="right"
              sideOffset={10}
              className={cn(
                "z-[60] select-none rounded-lg border border-hairline bg-elevated px-2.5 py-1.5",
                "text-xs font-medium text-ink shadow-bento",
                "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-left-1",
              )}
            >
              {label}
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        )}
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
