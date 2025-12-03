"use client";

import { useState } from "react";
import { PatientList } from "@/components/patients/patient-list";
import { PatientForm } from "@/components/patients/patient-form";
import { PatientDetails } from "@/components/patients/patient-details";
import { Patient } from "@/lib/entity/patients/patients";

export default function PatientsPage() {
  const [view, setView] = useState<"list" | "form" | "details">("list");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setView("form");
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setView("form");
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setView("details");
  };

  const handleBack = () => {
    setSelectedPatient(null);
    setView("list");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
        <p className="text-muted-foreground">
          Gestiona la información de tus pacientes
        </p>
      </div>

      {view === "list" && (
        <PatientList
          onNewPatient={handleNewPatient}
          onEditPatient={handleEditPatient}
          onViewPatient={handleViewPatient}
        />
      )}

      {view === "form" && (
        <PatientForm
          patient={selectedPatient}
          onSuccess={handleBack}
          onCancel={handleBack}
        />
      )}

      {view === "details" && selectedPatient && (
        <PatientDetails
          patient={selectedPatient}
          onEdit={handleEditPatient}
          onClose={handleBack}
        />
      )}
    </div>
  );
}
