"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";

const PatientsPageClient = dynamic(
  () =>
    import("@/components/patients/patients-page-client").then(
      (mod) => mod.PatientsPageClient
    ),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin tip="Cargando..." />
      </div>
    ),
  }
);

export default function PatientsSettingsPage() {
  return <PatientsPageClient />;
}
