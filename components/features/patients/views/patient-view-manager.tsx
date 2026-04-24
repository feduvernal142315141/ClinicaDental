import { Patient } from "@/lib/entity/patients";

interface PatientListViewProps {
  onNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onViewPatient: (patient: Patient) => void;
}

interface PatientFormViewProps {
  patient: Patient | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PatientDetailsViewProps {
  patient: Patient;
  onEdit: (patient: Patient) => void;
  onClose: () => void;
}

export type PatientViewProps =
  | { view: "list"; props: PatientListViewProps }
  | { view: "form"; props: PatientFormViewProps }
  | { view: "details"; props: PatientDetailsViewProps };

export function getPatientViewProps(
  view: "list" | "form" | "details",
  selectedPatient: Patient | null,
  handlers: {
    onNewPatient: () => void;
    onEditPatient: (patient: Patient) => void;
    onViewPatient: (patient: Patient) => void;
    onBack: () => void;
  }
): PatientViewProps {
  switch (view) {
    case "list":
      return {
        view: "list",
        props: {
          onNewPatient: handlers.onNewPatient,
          onEditPatient: handlers.onEditPatient,
          onViewPatient: handlers.onViewPatient,
        },
      };

    case "form":
      return {
        view: "form",
        props: {
          patient: selectedPatient,
          onSuccess: handlers.onBack,
          onCancel: handlers.onBack,
        },
      };

    case "details":
      return {
        view: "details",
        props: {
          patient: selectedPatient!,
          onEdit: handlers.onEditPatient,
          onClose: handlers.onBack,
        },
      };
  }
}
