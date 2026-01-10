"use client";

import { Switch, Tooltip } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useTheme } from "@/lib/hooks/use-theme";

interface ThemeSwitchProps {
  showLabel?: boolean;
  className?: string;
}

/**
 * Ant Design Theme Switch component
 * Toggles between light and dark mode
 */
export function ThemeSwitch({
  showLabel = false,
  className,
}: ThemeSwitchProps) {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <Switch
        disabled
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        className={className}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
      <div className={`flex items-center gap-2 ${className || ""}`}>
        <Switch
          checked={isDark}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
        {showLabel && (
          <span className="text-sm">{isDark ? "Oscuro" : "Claro"}</span>
        )}
      </div>
    </Tooltip>
  );
}
