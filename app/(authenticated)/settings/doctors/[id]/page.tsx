"use client";

import { use } from "react";
import { DoctorDetail } from "@/components/doctors";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return <DoctorDetail doctorId={id} basePath="/settings/users" />;
}
