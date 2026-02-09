"use client";

import { use } from "react";
import { PatientDetail } from "@/components/patients";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return <PatientDetail patientId={id} basePath="/patients" />;
}
