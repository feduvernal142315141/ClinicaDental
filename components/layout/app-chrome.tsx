"use client";

import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/constants/routes.constants";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Decide si renderizar el shell de la app (sidebar + header) o no.
 * Rutas públicas (login, recuperar contraseña, OTP) y la raíz se renderizan
 * sin chrome; el resto va dentro del AppShell shadcn.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  if (pathname === "/" || isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
