"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const PatientForm = dynamic(
  () =>
    import("@/components/patients/patient-form").then((mod) => mod.PatientForm),
  { loading: () => <LazyLoadingFallback /> }
);

export function NewPatientPageClient() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/patients");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <PatientForm
      patient={null}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
