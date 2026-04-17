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
import { Button as AntButton, Modal, Tabs, Typography } from "antd";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Separator } from "@/components/ui/primitives/shadcn/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/atomic/data-display/table";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
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
}

export function PatientDetail({
  patientId,
  basePath = "/patients",
}: PatientDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [activePatientTab, setActivePatientTab] = useState("general");

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
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no-show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Typography.Title level={2} className="!mb-1">
            Detalles del Paciente
          </Typography.Title>
          <p className="text-gray-500 text-sm mt-1">
            Información completa e historial médico
          </p>
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
                                <Circle className="h-4 w-4 text-gray-500" />
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
                              <FileText className="h-4 w-4 text-green-600" />
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
                        iconColor="text-blue-600"
                      />
                      <KpiCard
                        title="Completadas"
                        value={
                          appointments.filter(
                            (appointment) => appointment.status === "completed",
                          ).length
                        }
                        icon={Activity}
                        iconColor="text-green-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" /> Próximas Citas
                        </CardTitle>
                        <CardDescription>
                          {upcomingAppointments.length} cita
                          {upcomingAppointments.length !== 1 ? "s" : ""}{" "}
                          programada
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {upcomingAppointments.length === 0 ? (
                          <p className="py-4 text-center text-muted-foreground">
                            No hay citas próximas programadas
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {upcomingAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div>
                                  <p className="font-medium">
                                    Dr. {appointment.doctorName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(appointment.date)} a las{" "}
                                    {appointment.time}
                                  </p>
                                </div>
                                <Badge
                                  className={getStatusColor(appointment.status)}
                                >
                                  {getStatusText(appointment.status)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" /> Historial de Citas
                        </CardTitle>
                        <CardDescription>
                          {pastAppointments.length} cita
                          {pastAppointments.length !== 1 ? "s" : ""} anteriores
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {appointmentsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                            <span className="ml-2">Cargando historial...</span>
                          </div>
                        ) : pastAppointments.length === 0 ? (
                          <p className="py-4 text-center text-muted-foreground">
                            No hay historial de citas
                          </p>
                        ) : (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>Hora</TableHead>
                                  <TableHead>Doctor</TableHead>
                                  <TableHead>Motivo</TableHead>
                                  <TableHead>Estado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pastAppointments
                                  .sort(
                                    (left, right) =>
                                      new Date(
                                        `${right.date}T${right.time}`,
                                      ).getTime() -
                                      new Date(
                                        `${left.date}T${left.time}`,
                                      ).getTime(),
                                  )
                                  .map((appointment) => (
                                    <TableRow key={appointment.id}>
                                      <TableCell>
                                        {formatDate(appointment.date)}
                                      </TableCell>
                                      <TableCell>{appointment.time}</TableCell>
                                      <TableCell>
                                        Dr. {appointment.doctorName}
                                      </TableCell>
                                      <TableCell>
                                        {appointment.reason || "-"}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          className={getStatusColor(
                                            appointment.status,
                                          )}
                                        >
                                          {getStatusText(appointment.status)}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
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
            children: <PatientOdontogramPanel patient={patient} />,
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
