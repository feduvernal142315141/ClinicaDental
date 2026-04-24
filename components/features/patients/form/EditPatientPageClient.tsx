"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Patient } from "@/lib/entity/patients";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const PatientForm = dynamic(
  () =>
    import("@/components/features/patients/form/PatientForm").then(
      (mod) => mod.PatientForm
    ),
  { loading: () => <LazyLoadingFallback /> }
);

interface EditPatientPageClientProps {
  patient: Patient;
}

export function EditPatientPageClient({ patient }: EditPatientPageClientProps) {
  const router = useRouter();

  const handleSuccess = () => {
    router.push(`/patients/${patient.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <PatientForm
      patientId={patient.id}
      initialData={patient}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
