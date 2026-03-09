"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";

const NotificationsSettings = dynamic(
  () =>
    import("@/components/settings/notifications-settings").then(
      (mod) => mod.NotificationsSettings,
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

export default function NotificationsSettingsPage() {
  return <NotificationsSettings />;
}
