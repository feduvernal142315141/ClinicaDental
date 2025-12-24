"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Patient } from "@/lib/entity/patients/patients";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const PatientForm = dynamic(
  () =>
    import("@/components/patients/patient-form").then((mod) => mod.PatientForm),
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
      patient={patient}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
