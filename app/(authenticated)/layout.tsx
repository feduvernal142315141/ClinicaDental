"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { usePathname, useRouter } from "next/navigation";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Mapea la ruta actual a la sección del sidebar
  const getActiveSection = (path: string): string => {
    if (path.startsWith("/template-demo")) return "templates";
    if (path.startsWith("/campaigns")) return "campaigns";
    if (path.startsWith("/appointments")) return "appointments";
    if (path.startsWith("/patients")) return "users";
    if (path.startsWith("/settings")) return "settings";
    return "dashboard";
  };

  const handleSectionChange = () => {
    router.push("/");
  };

  return (
    <DashboardLayout
      activeSection={getActiveSection(pathname)}
      onSectionChange={handleSectionChange}
    >
      {children}
    </DashboardLayout>
  );
}

