"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Appointment } from "@/lib/entity/appointment/appointments";
import { getAppointmentsByDate } from "@/lib/supabase/appointments";

interface CalendarViewProps {
  onNewAppointment?: () => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function CalendarView({
  onNewAppointment,
  onAppointmentClick,
}: CalendarViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.clinicId) return;
      setLoading(true);
      try {
        const dayAppointments = await getAppointmentsByDate(
          selectedDate,
          user.clinicId
        );
        setAppointments(dayAppointments);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [selectedDate, user?.clinicId]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: Appointment["status"]) => {
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

  const getStatusText = (status: Appointment["status"]) => {
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

  const days = getDaysInMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendario de Citas</h1>
        {(user?.roleName === "admin" || user?.roleName === "patient") && (
          <Button onClick={onNewAppointment}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize">{monthYear}</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={index} className="p-2"></div>;
                }

                const dateStr = day.toISOString().split("T")[0];
                const isSelected = dateStr === selectedDate;
                const isToday =
                  dateStr === new Date().toISOString().split("T")[0];

                return (
                  <Button
                    key={index}
                    variant={isSelected ? "default" : "ghost"}
                    className={`p-2 h-12 flex flex-col items-center justify-center relative ${
                      isToday ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedDate(dateStr)}
                  >
                    <span className="text-sm">{day.getDate()}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {formatDate(new Date(selectedDate + "T00:00:00"))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : appointments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No hay citas programadas para este día.
                </p>
              ) : (
                appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onAppointmentClick?.(appointment)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{appointment.time}</span>
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      {user?.roleName !== "patient" && (
                        <p>
                          <strong>Paciente:</strong> {appointment.patientName}
                        </p>
                      )}
                      {user?.roleName !== "doctor" && (
                        <p>
                          <strong>Doctor:</strong> {appointment.doctorName}
                        </p>
                      )}
                      <p>
                        <strong>Tipo:</strong> {appointment.type}
                      </p>
                      <p>
                        <strong>Duración:</strong> {appointment.duration} min
                      </p>
                      {appointment.notes && (
                        <p className="text-muted-foreground">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
