"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { usePathname } from "next/navigation";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <DashboardLayout currentPath={pathname || "/"}>{children}</DashboardLayout>
  );
}
