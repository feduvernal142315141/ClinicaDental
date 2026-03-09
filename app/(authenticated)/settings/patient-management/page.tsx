"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";

const PatientsPageClient = dynamic(
  () => import("@/components/patients").then((mod) => mod.PatientsPageClient),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin description="Cargando...">
          <div style={{ padding: "50px" }} />
        </Spin>
      </div>
    ),
  },
);

export default function PatientsSettingsPage() {
  return <PatientsPageClient />;
}
