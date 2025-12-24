"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Patient } from "@/lib/entity/patients/patients";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const PatientDetails = dynamic(
  () =>
    import("@/components/patients/patient-details").then(
      (mod) => mod.PatientDetails
    ),
  { loading: () => <LazyLoadingFallback /> }
);

interface PatientDetailsPageClientProps {
  patient: Patient;
}

export function PatientDetailsPageClient({
  patient,
}: PatientDetailsPageClientProps) {
  const router = useRouter();

  const handleEdit = (patientToEdit: Patient) => {
    router.push(`/patients/${patientToEdit.id}/edit`);
  };

  const handleClose = () => {
    router.push("/patients");
  };

  return (
    <PatientDetails
      patient={patient}
      onEdit={handleEdit}
      onClose={handleClose}
    />
  );
}
