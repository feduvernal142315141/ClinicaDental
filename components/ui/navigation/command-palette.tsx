"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Moon, Sun, UserPlus } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/primitives/shadcn/command";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  useSidebarNavigation,
  type MenuItem,
} from "@/lib/hooks/use-sidebar-navigation";
import { useTheme } from "@/lib/hooks/use-theme";

/**
 * Command Palette global (⌘K / Ctrl+K).
 *
 * Navegación (respeta permisos vía `useSidebarNavigation(role)`), acciones
 * rápidas y cambio de tema. Tendencia 2026: flujos orientados al teclado.
 */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { mainMenuItems } = useSidebarNavigation(user?.roleName);
  const { resolvedTheme, setTheme } = useTheme();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  // Aplanar navegación: items de primer nivel + hijos (p.ej. Configuración).
  const navItems: { path: string; label: string; Icon: MenuItem["icon"] }[] = [];
  for (const item of mainMenuItems) {
    if (item.children?.length) {
      for (const child of item.children) {
        navItems.push({ path: child.path, label: child.label, Icon: child.icon });
      }
    } else {
      navItems.push({ path: item.path, label: item.label, Icon: item.icon });
    }
  }

  const isDark = resolvedTheme === "dark";

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar o ejecutar una acción…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Navegación">
          {navItems.map((n) => (
            <CommandItem
              key={n.path}
              value={n.label}
              onSelect={() => go(n.path)}
            >
              <n.Icon className="mr-2 h-4 w-4" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Acciones rápidas">
          <CommandItem
            value="Nueva cita"
            onSelect={() => go("/appointments/new")}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Nueva cita
          </CommandItem>
          <CommandItem
            value="Nuevo paciente"
            onSelect={() => go("/patients/new")}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo paciente
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Apariencia">
          <CommandItem
            value="Cambiar tema"
            onSelect={() => {
              setTheme(isDark ? "light" : "dark");
              setOpen(false);
            }}
          >
            {isDark ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {isDark ? "Tema claro" : "Tema oscuro"}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
