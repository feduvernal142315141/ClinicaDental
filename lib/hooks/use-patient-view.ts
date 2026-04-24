import { useState, useCallback } from "react";
import { Patient } from "@/lib/entity/patients";

type View = "list" | "form" | "details";

export function usePatientView() {
  const [view, setView] = useState<View>("list");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const showList = useCallback(() => {
    setSelectedPatient(null);
    setView("list");
  }, []);

  const showNewPatientForm = useCallback(() => {
    setSelectedPatient(null);
    setView("form");
  }, []);

  const showEditPatientForm = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setView("form");
  }, []);

  const showPatientDetails = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setView("details");
  }, []);

  return {
    view,
    selectedPatient,
    showList,
    showNewPatientForm,
    showEditPatientForm,
    showPatientDetails,
  };
}
