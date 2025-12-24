"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Patient } from "@/lib/entity/patients/patients";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const PatientList = dynamic(
  () =>
    import("@/components/patients/patient-list").then((mod) => mod.PatientList),
  { loading: () => <LazyLoadingFallback /> }
);

export function PatientsPageClient() {
  const router = useRouter();

  const handleNewPatient = () => {
    router.push("/patients/new");
  };

  const handleEditPatient = (patient: Patient) => {
    router.push(`/patients/${patient.id}/edit`);
  };

  const handleViewPatient = (patient: Patient) => {
    router.push(`/patients/${patient.id}`);
  };

  return (
    <PatientList
      onNewPatient={handleNewPatient}
      onEditPatient={handleEditPatient}
      onViewPatient={handleViewPatient}
    />
  );
}
