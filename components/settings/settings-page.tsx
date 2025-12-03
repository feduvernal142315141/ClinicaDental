"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives/shadcn/tabs";
import { GeneralSettings } from "./general-settings";
import { NotificationsSettings } from "./notifications-settings";
import { IntegrationsSettings } from "./integrations-settings";
import { PatientForm } from "../patients/patient-form";
import { PatientDetails } from "../patients/patient-details";
import { PatientList } from "../patients/patient-list";
import { useState } from "react";
import { Patient } from "@/lib/entity/patients/patients";
import DoctorsRolesSettings from "../doctors/DoctorsRolesSettings";

export function SettingsPage() {
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientRefreshKey, setPatientRefreshKey] = useState(0);

  const handlePatientSuccess = () => {
    setShowPatientForm(false);
    setEditingPatient(null);
    setPatientRefreshKey((prev) => prev + 1);
  };

  const handleNewPatient = () => {
    setEditingPatient(null);
    setShowPatientForm(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setShowPatientForm(true);
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handlePatientCancel = () => {
    setShowPatientForm(false);
    setEditingPatient(null);
  };

  const handlePatientClose = () => {
    setSelectedPatient(null);
  };

  const renderPatients = () => {
    if (showPatientForm) {
      return (
        <PatientForm
          patient={editingPatient}
          onSuccess={handlePatientSuccess}
          onCancel={handlePatientCancel}
        />
      );
    }
    if (selectedPatient) {
      return (
        <PatientDetails
          patient={selectedPatient}
          onEdit={handleEditPatient}
          onClose={handlePatientClose}
        />
      );
    }
    return (
      <PatientList
        key={patientRefreshKey}
        onNewPatient={handleNewPatient}
        onEditPatient={handleEditPatient}
        onViewPatient={handleViewPatient}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Administra la configuración de tu clínica y personaliza el sistema
          según tus necesidades.
        </p>
      </div>

      <Tabs defaultValue="patients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Opciones Generales</TabsTrigger>
          <TabsTrigger value="patients">Gestión de Pacientes</TabsTrigger>
          <TabsTrigger value="users">Doctores y Roles</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="integrations">Integraciones</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          {renderPatients()}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <DoctorsRolesSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsSettings />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <IntegrationsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
