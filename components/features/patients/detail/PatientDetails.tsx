"use client";

import { useEffect, useState } from "react";
import { genderOptions, type Patient } from "@/lib/entity/patients/patients";
import { appointmentsService } from "@/lib/services/appointments";
import type { Appointment } from "@/lib/entity/appointment";
import { calculateAge, formatDate } from "@/lib/entity/patients/patients-utils";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives/shadcn/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/atomic/data-display/table";
import {
  ArrowLeft,
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
import { PatientOdontogramPanel } from "./PatientOdontogramPanel";

interface PatientDetailsProps {
  patient: Patient;
  onEdit: (patient: Patient) => void;
  onClose: () => void;
}

export function PatientDetails({
  patient,
  onEdit,
  onClose,
}: PatientDetailsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patient.id) {
      void loadAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentsService.getPatientAppointments(patient.id);
      setAppointments(data);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Detalles del Paciente</h1>
          <p className="text-muted-foreground">
            Información completa e historial médico
          </p>
        </div>
        <Button onClick={() => onEdit(patient)}>
          <Edit className="mr-2 h-4 w-4" /> Editar
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Datos personales</TabsTrigger>
          <TabsTrigger value="odontogram">Odontograma</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
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
                    <h3 className="text-lg font-semibold">{patient.name}</h3>
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
                          {formatDate(patient.created_at || "")}
                        </p>
                      </div>
                    </div>

                    {patient.gender && (
                      <div className="flex items-center gap-3">
                        {patient.gender.toUpperCase() === "M" ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : patient.gender.toUpperCase() === "F" ? (
                          <UserRound className="h-4 w-4 text-pink-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">Género</p>
                          <p className="text-sm text-muted-foreground">
                            {genderOptions.find(
                              (gender) =>
                                gender.value === patient.gender?.toUpperCase(),
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
                            {patient.agreement ? "Sí, acepto" : "No, no acepto"}
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
                    {upcomingAppointments.length !== 1 ? "s" : ""} programada
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
                          <Badge className={getStatusColor(appointment.status)}>
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
                  {loading ? (
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
                                new Date(`${left.date}T${left.time}`).getTime(),
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
        </TabsContent>

        <TabsContent value="odontogram">
          <PatientOdontogramPanel patient={patient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
