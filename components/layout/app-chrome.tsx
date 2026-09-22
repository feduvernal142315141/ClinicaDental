"use client";

import { usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/constants/routes.constants";
import { AppShell } from "@/components/layout/app-shell";

const BLEED_ROUTE = /^\/patients\/(?!new$)[^/]+$/;
function isBleedRoute(pathname: string): boolean {
  return BLEED_ROUTE.test(pathname);
}
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  if (pathname === "/" || isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return <AppShell bleed={isBleedRoute(pathname)}>{children}</AppShell>;
}
