"use client";

import { Header } from "@/components/ui/atomic/layout/header";
import { PatientsPageClient } from "@/components/patients/patients-page-client";

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <Header
        level={1}
        title="Pacientes"
        description="Gestiona la información de tus pacientes"
        showSearch
        searchPlaceholder="Buscar pacientes..."
      />

      <PatientsPageClient />
    </div>
  );
}
