"use client";

import { ConfigProvider, App, theme } from "antd";
import { useTheme } from "@/lib/hooks/use-theme";

/**
 * Provider de compatibilidad con Ant Design durante la migración a Radix/shadcn.
 *
 * Mantiene `ConfigProvider` (algoritmo dark/light sincronizado con next-themes)
 * y el contexto `<App>` de antd que aún requieren los componentes/modales antd
 * todavía no migrados (`App.useApp().modal`, `Modal.confirm`, etc.).
 *
 * Se eliminará en la fase final, cuando antd salga del proyecto.
 */
export function AntdCompatProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        // Alinea el primary de antd con el token Bento `--brand`
        // (#2563eb light / #3b82f6 dark) para que los componentes antd que
        // siguen vivos durante la migración no choquen con la estética Bento.
        token: {
          borderRadius: 8,
          colorPrimary: isDark ? "#3b82f6" : "#2563eb",
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
