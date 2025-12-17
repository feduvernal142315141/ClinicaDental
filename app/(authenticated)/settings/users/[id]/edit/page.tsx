"use client";

import { use } from "react";
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: PageProps) {
  const { id } = use(params);
  return <ManagerUserForm userId={id} basePath="/settings/users" />;
}
