"use client";

import dynamic from "next/dynamic";
import { Patient } from "@/lib/entity/patients/patients";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const ClinicalHistoryPage = dynamic(
  () =>
    import(
      "@/components/features/patients/clinical-history-page/ClinicalHistoryPage"
    ).then((mod) => mod.ClinicalHistoryPage),
  { loading: () => <LazyLoadingFallback /> }
);

interface PatientDetailsPageClientProps {
  patient: Patient;
}

export function PatientDetailsPageClient({
  patient,
}: PatientDetailsPageClientProps) {
  return (
    <ClinicalHistoryPage
      patientId={patient.id}
      basePath={`/patients/${patient.id}`}
    />
  );
}
