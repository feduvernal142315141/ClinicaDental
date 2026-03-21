"use client";

import { Tabs as AntdTabs } from "antd";
import type { ReactNode } from "react";

export interface OdontogramTabItem {
  key: string;
  label: ReactNode;
  children: ReactNode;
  disabled?: boolean;
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

/**
 * Wrapper de Tabs AntD para el módulo odontograma.
 * Reemplaza Tabs/TabsList/TabsTrigger/TabsContent de Radix.
 */
export function OdontogramTabs({
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  className,
  type = "line",
}: OdontogramTabsProps) {
  return (
    <AntdTabs
      items={items}
      activeKey={activeKey}
      defaultActiveKey={defaultActiveKey}
      onChange={onChange}
      className={className}
      type={type}
      destroyOnHidden={false}
    />
  );
}
