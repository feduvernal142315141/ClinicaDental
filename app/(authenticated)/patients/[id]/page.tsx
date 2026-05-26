"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ClinicalHistoryPage } from "@/components/features/patients/clinical-history-page/ClinicalHistoryPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") ?? undefined;
  const activeAppointmentId = searchParams.get("appointmentId") ?? undefined;
  const openFinalizeOnLoad = searchParams.get("finalize") === "1";

  return (
    <ClinicalHistoryPage
      patientId={id}
      initialTab={initialTab}
      activeAppointmentId={activeAppointmentId}
      openFinalizeOnLoad={openFinalizeOnLoad}
    />
  );
}
