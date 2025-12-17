"use client";

import dynamic from "next/dynamic";
import { Spin } from "antd";

const ManagerUserForm = dynamic(
  () => import("@/components/manager-users").then((mod) => mod.ManagerUserForm),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin tip="Cargando..." />
      </div>
    ),
  }
);

export default function NewUserPage() {
  return <ManagerUserForm basePath="/settings/users" />;
}
