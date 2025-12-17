"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";

const ManagerUserDetail = dynamic(
  () =>
    import("@/components/manager-users").then((mod) => mod.ManagerUserDetail),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Spin tip="Cargando..." />
      </div>
    ),
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return <ManagerUserDetail userId={id} basePath="/settings/users" />;
}
