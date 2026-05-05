"use client";

import { Tabs as AntdTabs } from "antd";
import type { ReactNode } from "react";

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
  /** Estilo visual de las tabs */
  type?: "line" | "card";
}

/** Maps status dot colors to Tailwind-friendly CSS values */
const DOT_COLORS: Record<string, string> = {
  green: "#10B981",
  blue: "#3B82F6",
  amber: "#F59E0B",
  red: "#EF4444",
  muted: "#D1D5DB",
};

/**
 * Wrapper de Tabs AntD para el módulo odontograma.
 * Supports status dots that signal data presence per tab.
 */
export function OdontogramTabs({
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  className,
  type = "line",
}: OdontogramTabsProps) {
  const enhancedItems = items.map((item) => ({
    ...item,
    label:
      item.statusDot ? (
        <span className="inline-flex items-center gap-1.5">
          {item.label}
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: DOT_COLORS[item.statusDot] ?? DOT_COLORS.muted }}
            title={
              item.statusDot === "green"
                ? "Datos registrados"
                : item.statusDot === "blue"
                  ? "Planes agregados"
                  : item.statusDot === "amber"
                    ? "Pendiente revisión"
                    : item.statusDot === "muted"
                      ? "Próximamente"
                      : ""
            }
          />
        </span>
      ) : (
        item.label
      ),
  }));

  return (
    <AntdTabs
      items={enhancedItems}
      activeKey={activeKey}
      defaultActiveKey={defaultActiveKey}
      onChange={onChange}
      className={className}
      type={type}
      destroyOnHidden={false}
      size="small"
    />
  );
}
