"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";

const GeneralSettings = dynamic(
  () =>
    import("@/components/settings/general-settings").then(
      (mod) => mod.GeneralSettings,
    ),
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

export default function GeneralSettingsPage() {
  return <GeneralSettings />;
}
