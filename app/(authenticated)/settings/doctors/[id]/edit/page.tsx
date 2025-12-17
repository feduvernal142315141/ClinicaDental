"use client";

import { use } from "react";
import { DoctorForm } from "@/components/doctors";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: PageProps) {
  const { id } = use(params);
  return <DoctorForm doctorId={id} basePath="/settings/users" />;
}
