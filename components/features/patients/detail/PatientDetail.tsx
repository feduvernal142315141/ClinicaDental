"use client";

import { useEffect, useState } from "react";
import {
  genderOptions,
  type Patient,
  calculateAge,
  formatDate,
} from "@/lib/entity/patients";
import { appointmentsService } from "@/lib/services/appointments";
import type { Appointment } from "@/lib/entity/appointment";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { KpiCard } from "@/components/ui/atomic/data-display/kpi-card";
import { Button as AntButton, Modal, Tabs, Timeline, Typography } from "antd";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Separator } from "@/components/ui/primitives/shadcn/separator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Activity,
  UserRound,
  Circle,
  FileText,
} from "lucide-react";
import {
  EditOutlined,
  ArrowLeftOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { usePatients, usePatientsPage } from "@/lib/hooks/patients";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { clearOdontogram } from "@/lib/odontogram";
import { PatientOdontogramPanel } from "./PatientOdontogramPanel";
import { ClinicalHistoryPanel } from "@/components/features/clinical-history";

interface PatientDetailProps {
  patientId: string;
  basePath?: string;
  initialTab?: string;
  activeAppointmentId?: string;
}

export function PatientDetail({
  patientId,
  basePath = "/patients",
  initialTab,
  activeAppointmentId: externalAppointmentId,
}: PatientDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [activePatientTab, setActivePatientTab] = useState(
    initialTab ?? "general",
  );

  const { handleBackToList, handleEditPatient } = usePatientsPage({ basePath });
  const { getPatientById } = usePatients();
  const { can, isAdmin } = usePermission();
  const canEditPatient = isAdmin || can("patients", PermissionAction.EDIT);
  const canAccessClinicalHistory =
    isAdmin ||
    can("clinical_history", PermissionAction.CREATE) ||
    can("clinical_history", PermissionAction.EDIT);

  const handleClearOdontogram = () => {
    Modal.confirm({
      title: "¿Estás seguro?",
      content:
        "Esta acción eliminará todos los datos del odontograma, incluyendo diagnósticos, planes y eventos clínicos. Esta acción no se puede deshacer.",
      okText: "Sí, limpiar todo",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: clearOdontogram,
    });
  };

  useEffect(() => {
    void loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (patient?.id) {
      void loadAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const data = await getPatientById(patientId);
      setPatient(data);
    } catch (error) {
      console.error("Error loading patient:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    if (!patient?.id) return;

    try {
      setAppointmentsLoading(true);
      const data = await appointmentsService.getPatientAppointments(patient.id);
      setAppointments(data);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-sky-500/15 text-sky-600 ring-sky-400/25 dark:text-sky-300";
      case "completed":
        return "bg-emerald-500/15 text-emerald-600 ring-emerald-400/25 dark:text-emerald-300";
      case "cancelled":
        return "bg-rose-500/15 text-rose-600 ring-rose-400/25 dark:text-rose-300";
      case "no-show":
        return "bg-elevated text-subtle";
      default:
        return "bg-elevated text-subtle";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Programada";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      case "no-show":
        return "No asistió";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <span className="ml-2">Cargando paciente...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!patient) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Paciente no encontrado</p>
            <AntButton onClick={handleBackToList} className="mt-4">
              Volver a la lista
            </AntButton>
          </div>
        </CardContent>
      </Card>
    );
  }

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      new Date(`${appointment.date}T${appointment.time}`) > new Date() &&
      appointment.status === "scheduled",
  );

  const pastAppointments = appointments.filter(
    (appointment) =>
      new Date(`${appointment.date}T${appointment.time}`) <= new Date() ||
      appointment.status !== "scheduled",
  );

  // Cita activa del día de hoy (para habilitar finalización desde odontograma)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayActiveAppointment = appointments.find(
    (a) => a.status === "scheduled" && a.date === todayStr,
  );

  // Priorizar el appointmentId externo (venido de la agenda vía query param)
  // sobre la detección interna de la cita activa del día.
  const resolvedAppointmentId =
    externalAppointmentId ?? todayActiveAppointment?.id;

  // Información para el badge "Consulta en curso" cuando se llega desde
  // "Iniciar consulta" de la agenda.
  const activeConsultationAppointment = externalAppointmentId
    ? appointments.find((a) => a.id === externalAppointmentId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Typography.Title level={2} className="!mb-1">
            Detalles del Paciente
          </Typography.Title>
          <p className="text-subtle text-sm mt-1">
            Información completa e historial médico
          </p>
          {externalAppointmentId && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/25 rounded-lg text-sm text-emerald-600 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Consulta en curso
              {activeConsultationAppointment && (
                <span className="text-emerald-600 dark:text-emerald-300 font-medium">
                  · {activeConsultationAppointment.time}
                  {activeConsultationAppointment.serviceName
                    ? ` — ${activeConsultationAppointment.serviceName}`
                    : activeConsultationAppointment.type
                      ? ` — ${activeConsultationAppointment.type}`
                      : ""}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AntButton
            icon={<ArrowLeftOutlined />}
            size="large"
            onClick={handleBackToList}
          >
            Atrás
          </AntButton>
          <AntButton
            type="primary"
            icon={<EditOutlined />}
            size="large"
            onClick={() => handleEditPatient(patientId)}
          >
            Editar
          </AntButton>
          {activePatientTab === "odontogram" && canEditPatient && (
            <AntButton
              icon={<RedoOutlined />}
              size="large"
              onClick={handleClearOdontogram}
            >
              Limpiar Todo
            </AntButton>
          )}
        </div>
      </div>

      <Tabs
        activeKey={activePatientTab}
        onChange={setActivePatientTab}
        items={[
          {
            key: "general",
            label: "Datos personales",
            children: (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-1">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" /> Información Personal
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {patient.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            ID: {patient.id}
                          </p>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Edad</p>
                              <p className="text-sm text-muted-foreground">
                                {calculateAge(patient.dateOfBirth).years} años y{" "}
                                {calculateAge(patient.dateOfBirth).months} meses
                              </p>
                            </div>
                          </div>

                          {patient.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Email</p>
                                <p className="text-sm text-muted-foreground">
                                  {patient.email}
                                </p>
                              </div>
                            </div>
                          )}

                          {patient.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Teléfono</p>
                                <p className="text-sm text-muted-foreground">
                                  {patient.phone}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                Fecha de Registro
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(patient.createAt)}
                              </p>
                            </div>
                          </div>

                          {patient.gender && (
                            <div className="flex items-center gap-3">
                              {patient.gender === "M" ? (
                                <User className="h-4 w-4 text-blue-600" />
                              ) : patient.gender === "F" ? (
                                <UserRound className="h-4 w-4 text-pink-600" />
                              ) : (
                                <Circle className="h-4 w-4 text-subtle" />
                              )}
                              <div>
                                <p className="text-sm font-medium">Género</p>
                                <p className="text-sm text-muted-foreground">
                                  {genderOptions.find(
                                    (gender) => gender.value === patient.gender,
                                  )?.label || "No especificado"}
                                </p>
                              </div>
                            </div>
                          )}

                          {patient.agreement !== undefined && (
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                              <div>
                                <p className="text-sm font-medium">Convenio</p>
                                <p className="text-sm text-muted-foreground">
                                  {patient.agreement
                                    ? "Sí, acepto"
                                    : "No, no acepto"}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <KpiCard
                        title="Próximas Citas"
                        value={upcomingAppointments.length}
                        icon={Calendar}
                        iconColor="text-sky-600 dark:text-sky-300"
                      />
                      <KpiCard
                        title="Completadas"
                        value={
                          appointments.filter(
                            (appointment) => appointment.status === "completed",
                          ).length
                        }
                        icon={Activity}
                        iconColor="text-emerald-600 dark:text-emerald-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 lg:col-span-2">
                    {/* ── UNIFIED APPOINTMENT TIMELINE ── */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-brand" />
                          Línea de Tiempo de Citas
                        </CardTitle>
                        <CardDescription>
                          {upcomingAppointments.length} próxima
                          {upcomingAppointments.length !== 1 ? "s" : ""} ·{" "}
                          {pastAppointments.length} anterior
                          {pastAppointments.length !== 1 ? "es" : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {appointmentsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">
                              Cargando citas...
                            </span>
                          </div>
                        ) : appointments.length === 0 ? (
                          <p className="py-8 text-center text-muted-foreground">
                            No hay citas registradas
                          </p>
                        ) : (
                          <Timeline
                            mode="start"
                            items={[
                              // ── Sección: próximas ──────────────────────
                              ...(upcomingAppointments.length > 0
                                ? [
                                    {
                                      icon: (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 text-[10px] font-bold">
                                          →
                                        </span>
                                      ),
                                      title: (
                                        <span className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                                          Próximas
                                        </span>
                                      ),
                                      content: null,
                                    },
                                    ...upcomingAppointments.map((appt) => ({
                                      color: "blue",
                                      title: (
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          {formatDate(appt.date)}
                                          <br />
                                          {appt.time}
                                        </span>
                                      ),
                                      content: (
                                        <div className="mb-2 rounded-xl bg-sky-500/15 px-4 py-3">
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <p className="font-semibold text-sky-700 dark:text-sky-300 text-sm">
                                                Dr. {appt.doctorName}
                                              </p>
                                              {appt.reason && (
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                  {appt.reason}
                                                </p>
                                              )}
                                            </div>
                                            <Badge className="shrink-0 bg-sky-500/15 text-sky-600 ring-sky-400/25 dark:text-sky-300 hover:bg-sky-500/15 text-[11px]">
                                              {getStatusText(appt.status)}
                                            </Badge>
                                          </div>
                                        </div>
                                      ),
                                    })),
                                  ]
                                : []),
                              // ── Sección: historial ─────────────────────
                              ...(pastAppointments.length > 0
                                ? [
                                    {
                                      icon: (
                                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-elevated text-subtle text-[10px] font-bold">
                                          ↺
                                        </span>
                                      ),
                                      title: (
                                        <span className="text-xs font-semibold uppercase tracking-wide text-subtle">
                                          Historial
                                        </span>
                                      ),
                                      content: null,
                                    },
                                    ...pastAppointments
                                      .sort(
                                        (l, r) =>
                                          new Date(
                                            `${r.date}T${r.time}`,
                                          ).getTime() -
                                          new Date(
                                            `${l.date}T${l.time}`,
                                          ).getTime(),
                                      )
                                      .map((appt) => {
                                        const dotColor =
                                          appt.status === "completed"
                                            ? "green"
                                            : appt.status === "cancelled"
                                              ? "red"
                                              : appt.status === "no-show"
                                                ? "orange"
                                                : "gray";
                                        const bgClass =
                                          appt.status === "completed"
                                            ? "bg-emerald-500/15"
                                            : appt.status === "cancelled"
                                              ? "bg-rose-500/15"
                                              : appt.status === "no-show"
                                                ? "bg-amber-500/15"
                                                : "bg-hover";
                                        return {
                                          color: dotColor,
                                          title: (
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                              {formatDate(appt.date)}
                                              <br />
                                              {appt.time}
                                            </span>
                                          ),
                                          content: (
                                            <div
                                              className={`mb-2 rounded-xl ${bgClass} px-4 py-3`}
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div>
                                                  <p className="font-semibold text-ink text-sm">
                                                    Dr. {appt.doctorName}
                                                  </p>
                                                  {appt.reason && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                      {appt.reason}
                                                    </p>
                                                  )}
                                                </div>
                                                <Badge
                                                  className={`shrink-0 ${getStatusColor(appt.status)} text-[11px]`}
                                                >
                                                  {getStatusText(appt.status)}
                                                </Badge>
                                              </div>
                                            </div>
                                          ),
                                        };
                                      }),
                                  ]
                                : []),
                            ]}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "odontogram",
            label: "Odontograma",
            children: (
              <PatientOdontogramPanel
                patient={patient}
                activeAppointmentId={resolvedAppointmentId}
              />
            ),
          },
          ...(canAccessClinicalHistory
            ? [
                {
                  key: "clinical-history",
                  label: "Historia clínica",
                  children: (
                    <ClinicalHistoryPanel
                      patientId={patientId}
                      onNavigateToOdontogram={() =>
                        setActivePatientTab("odontogram")
                      }
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
