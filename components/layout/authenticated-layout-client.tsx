/**
 * AUTHENTICATED LAYOUT WRAPPER (CLIENT COMPONENT)
 *
 * Wrapper que maneja pathname del lado del cliente
 * Permite que el layout principal sea más limpio
 */

"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { usePathname } from "next/navigation";

interface AuthenticatedLayoutClientProps {
  children: React.ReactNode;
}

export function AuthenticatedLayoutClient({
  children,
}: AuthenticatedLayoutClientProps) {
  const pathname = usePathname();

  return (
    <DashboardLayout currentPath={pathname || "/"}>{children}</DashboardLayout>
  );
}
