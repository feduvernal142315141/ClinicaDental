"use client";

import { Header } from "@/components/ui/atomic/layout/header";
import { AppointmentsPageClient } from "@/components/appointments/appointments-page-client";

export default function AppointmentsPage() {
  return (
    <div className="space-y-8">
      <Header
        level={1}
        title="Citas"
        showSearch
        searchPlaceholder="Buscar citas..."
      />

      <AppointmentsPageClient />
    </div>
  );
}
