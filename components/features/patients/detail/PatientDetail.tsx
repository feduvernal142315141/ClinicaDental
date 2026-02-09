"use client";

import { useState, useEffect } from "react";
import {
  genderOptions,
  genderDisplayOptions,
  type Patient,
  calculateAge,
  formatDate,
} from "@/lib/entity/patients";
import {
  getAppointmentsByPatient,
  type Appointment,
} from "@/lib/entity/appointment/appointments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { KpiCard } from "@/components/ui/atomic/data-display/kpi-card";
import { Button } from "@/components/ui/primitives/shadcn/button";
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
import { SectionTitle } from "@/components/ui/antd";
import {
  Edit,
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
import { usePatients, usePatientsPage } from "@/lib/hooks/patients";

interface PatientDetailProps {
  /** Patient ID */
  patientId: string;
  /** Base path for navigation */
  basePath?: string;
}

/**
 * PatientDetail Component
 *
 * Displays complete information about a patient including
 * personal data and appointment history.
 */
export function PatientDetail({
  patientId,
  basePath = "/patients",
}: PatientDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const { handleBackToList, handleEditPatient } = usePatientsPage({ basePath });
  const { getPatientById } = usePatients();

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  useEffect(() => {
    if (patient?.id) {
      loadAppointments();
    }
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
      const data = await getAppointmentsByPatient(patient.id);
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            <Button onClick={handleBackToList} className="mt-4">
              Volver a la lista
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const upcomingAppointments = appointments.filter(
    (apt) =>
      new Date(`${apt.date}T${apt.time}`) > new Date() &&
      apt.status === "scheduled",
  );

  const pastAppointments = appointments.filter(
    (apt) =>
      new Date(`${apt.date}T${apt.time}`) <= new Date() ||
      apt.status !== "scheduled",
  );

  return (
    <>
      <SectionTitle
        title="Detalles del Paciente"
        subtitle="Información completa e historial médico"
        actionButton={{
          label: "Atrás",
          onClick: handleBackToList,
          variant: "back",
          type: "default",
        }}
      />

      <div className="flex justify-end mb-4">
        <Button onClick={() => handleEditPatient(patientId)}>
          <Edit className="h-4 w-4 mr-2" /> Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información personal */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{patient.name}</h3>
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
                    <p className="text-sm font-medium">Fecha de Registro</p>
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
                        {genderOptions.find((g) => g.value === patient?.gender)
                          ?.label || "No especificado"}
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
                        {patient.agreement ? "Sí, acepto" : "No, no acepto"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
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
                appointments.filter((a) => a.status === "completed").length
              }
              icon={Activity}
              iconColor="text-green-600"
            />
          </div>
        </div>

        {/* Historial */}
        <div className="lg:col-span-2 space-y-6">
          {/* Próximas citas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Próximas Citas
              </CardTitle>
              <CardDescription>
                {upcomingAppointments.length} cita
                {upcomingAppointments.length !== 1 ? "s" : ""} programada
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay citas próximas programadas
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
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
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de citas */}
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2">Cargando historial...</span>
                </div>
              ) : pastAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
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
                          (a, b) =>
                            new Date(`${b.date}T${b.time}`).getTime() -
                            new Date(`${a.date}T${a.time}`).getTime(),
                        )
                        .map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell>
                              {formatDate(appointment.date)}
                            </TableCell>
                            <TableCell>{appointment.time}</TableCell>
                            <TableCell>Dr. {appointment.doctorName}</TableCell>
                            <TableCell>{appointment.reason || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                className={getStatusColor(appointment.status)}
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
    </>
  );
}
