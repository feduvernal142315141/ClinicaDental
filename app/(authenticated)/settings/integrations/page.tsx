"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";

const IntegrationsSettings = dynamic(
  () =>
    import("@/components/settings/integrations-settings").then(
      (mod) => mod.IntegrationsSettings
    ),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin tip="Cargando...">
          <div style={{ padding: "50px" }} />
        </Spin>
      </div>
    ),
  }
);

export default function IntegrationsSettingsPage() {
  return <IntegrationsSettings />;
}
