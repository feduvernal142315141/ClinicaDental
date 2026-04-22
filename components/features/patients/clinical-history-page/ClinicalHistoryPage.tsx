"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, Badge, Spin } from "antd";
import { Stethoscope, ClipboardList } from "lucide-react";
import { patientsService } from "@/lib/services/patients/patients.service";
import { appointmentsService } from "@/lib/services/appointments/appointments.service";
import { useClinicalHistory } from "@/lib/hooks/clinical-history";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { PatientInfoColumn } from "./PatientInfoColumn";
import { MedicalAntecedentsColumn } from "./MedicalAntecedentsColumn";
import { AppointmentsColumn } from "./AppointmentsColumn";
import { PatientOdontogramPanel } from "@/components/features/patients/detail/PatientOdontogramPanel";
import type { Patient } from "@/lib/entity/patients/patients";
import type { Appointment } from "@/lib/entity/appointment/appointments";

interface ClinicalHistoryPageProps {
  patientId: string;
  basePath?: string;
  initialTab?: string;
  activeAppointmentId?: string;
}

export function ClinicalHistoryPage({
  patientId,
  initialTab = "historia-clinica",
  activeAppointmentId,
}: ClinicalHistoryPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [historicVisitId, setHistoricVisitId] = useState<string | undefined>(undefined);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const { snapshot, loading: snapshotLoading, loadSnapshot, refresh } =
    useClinicalHistory();

  const { isAdmin, can } = usePermission();
  const canManageAttachments = isAdmin || can('patients', PermissionAction.EDIT);
  const canEditMedicalHistory = isAdmin || can('clinical_history', PermissionAction.EDIT) || can('clinical_history', PermissionAction.CREATE);

  // Load patient
  useEffect(() => {
    let cancelled = false;
    setPatientLoading(true);
    patientsService
      .getPatientById(patientId)
      .then((p) => {
        if (!cancelled) setPatient(p);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPatientLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Load clinical snapshot
  useEffect(() => {
    loadSnapshot(patientId);
  }, [patientId, loadSnapshot]);

  // Load appointments
  const loadAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    try {
      const data = await appointmentsService.getPatientAppointments(patientId);
      setAppointments(data);
    } catch {
      // ignore
    } finally {
      setAppointmentsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleViewOdontogram = useCallback((visitId: string) => {
    setHistoricVisitId(visitId);
    setActiveTab("odontograma");
  }, []);

  const handleBackToCurrentOdontogram = useCallback(() => {
    setHistoricVisitId(undefined);
  }, []);

  if (patientLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Paciente no encontrado
      </div>
    );
  }

  const tabItems = [
    {
      key: "historia-clinica",
      label: (
        <span className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Historia Clínica
        </span>
      ),
      children: (
        <div className="grid grid-cols-[280px_1fr_300px] gap-6 h-full min-h-0">
          {/* Col 1: Patient info */}
          {snapshotLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Spin />
            </div>
          ) : (
            <PatientInfoColumn
              patient={patient}
              medicalHistory={snapshot?.medicalHistory ?? null}
              patientHeader={snapshot?.patientHeader ?? null}
              canUpload={canManageAttachments}
              canDelete={canManageAttachments}
            />
          )}

          {/* Col 2: Medical antecedents */}
          {snapshotLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Spin />
            </div>
          ) : (
            <MedicalAntecedentsColumn
              medicalHistory={snapshot?.medicalHistory ?? null}
              patientHeader={snapshot?.patientHeader ?? null}
              patientId={patientId}
              onMedicalHistoryUpdated={() => refresh()}
              canEdit={canEditMedicalHistory}
            />
          )}

          {/* Col 3: Appointments */}
          <AppointmentsColumn
            appointments={appointments}
            loading={appointmentsLoading}
            patientId={patientId}
            activeAppointmentId={activeAppointmentId}
            onViewOdontogram={handleViewOdontogram}
          />
        </div>
      ),
    },
    {
      key: "odontograma",
      label: (
        <span className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Odontograma
        </span>
      ),
      children: (
        <PatientOdontogramPanel
          patient={patient}
          activeAppointmentId={activeAppointmentId}
          historicVisitId={historicVisitId}
          onClearHistoric={handleBackToCurrentOdontogram}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{patient.name}</h1>
          <p className="text-sm text-muted-foreground">
            Historia clínica del paciente
          </p>
        </div>
        {activeAppointmentId && (
          <Badge status="processing" color="green" text="Consulta en curso" />
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="flex-1 flex flex-col [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full"
      />
    </div>
  );
}
