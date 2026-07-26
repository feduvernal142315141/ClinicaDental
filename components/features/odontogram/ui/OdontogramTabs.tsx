"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { cn } from "@/lib/utils/utils";

export interface OdontogramTabItem {
  key: string;
  label: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  /** Status dot color: signals data presence in the tab */
  statusDot?: "green" | "blue" | "amber" | "red" | "muted" | null;
}

export interface OdontogramTabsProps {
  items: OdontogramTabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  className?: string;
  /**
   * Ocupa toda la altura disponible: la tab activa se vuelve una columna
   * flexible que puede scrollear por dentro. Requiere un padre con altura
   * definida. Sin esto las tabs conservan su altura natural (ToothModal).
   */
  fill?: boolean;
}

/** Clases de token semántico para el punto de estado por color */
const DOT_CLASSES: Record<string, string> = {
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  muted: "bg-ink/20",
};

/** Tooltips explicativos del punto de estado */
const DOT_TITLES: Record<string, string> = {
  green: "Datos registrados",
  blue: "Planes agregados",
  amber: "Pendiente revisión",
  muted: "Próximamente",
};

/**
 * Wrapper de Tabs (Radix/shadcn) para el módulo odontograma, con estilo de
 * línea Bento. Supports status dots that signal data presence per tab.
 *
 * Los contenidos se montan con `forceMount` y se ocultan con CSS cuando la
 * tab está inactiva (paridad con antd `destroyOnHidden={false}`): las tabs
 * del ToothModal tienen estado local y no deben desmontarse al cambiar.
 */
export function OdontogramTabs({
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  className,
  fill = false,
}: OdontogramTabsProps) {
  return (
    <Tabs
      value={activeKey}
      defaultValue={defaultActiveKey ?? items[0]?.key}
      onValueChange={onChange}
      className={cn("w-full", fill && "flex min-h-0 flex-col", className)}
    >
      <TabsList className="flex h-auto w-full shrink-0 items-center justify-start gap-0 rounded-none border-0 border-b border-hairline bg-transparent p-0">
        {items.map((item) => (
          <TabsTrigger
            key={item.key}
            value={item.key}
            disabled={item.disabled}
            className="-mb-px rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-subtle transition-colors hover:text-ink data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-ink data-[state=active]:shadow-none"
          >
            {item.label}
            {item.statusDot && (
              <span
                className={cn(
                  "inline-block h-2 w-2 shrink-0 rounded-full",
                  DOT_CLASSES[item.statusDot] ?? DOT_CLASSES.muted,
                )}
                title={DOT_TITLES[item.statusDot] ?? ""}
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent
          key={item.key}
          value={item.key}
          forceMount
          className={cn(
            "mt-3 data-[state=inactive]:hidden",
            fill && "flex min-h-0 flex-1 flex-col",
          )}
        >
          {item.children}
        </TabsContent>
      ))}
    </Tabs>
  );
}
