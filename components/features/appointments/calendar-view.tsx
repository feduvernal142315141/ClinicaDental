"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { Appointment } from "@/lib/entity/appointment/appointments";
import { useCalendar } from "@/lib/hooks/use-calendar";
import { CalendarHeader } from "@/components/ui/atomic/data-display/calendar-header";
import { CalendarGrid } from "@/components/ui/atomic/data-display/calendar-grid";
import { AppointmentList } from "@/components/ui/atomic/data-display/appointment-list-item";
import { formatAppointmentDate } from "@/lib/utils/appointment-utils";

interface CalendarViewProps {
  onNewAppointment?: () => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function CalendarView({
  onNewAppointment,
  onAppointmentClick,
}: CalendarViewProps) {
  const { user } = useAuth();

  // Custom hook con toda la lógica del calendario
  const {
    currentDate,
    selectedDate,
    appointments,
    loading,
    getDaysInMonth,
    navigateMonth,
    selectDate,
  } = useCalendar();

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendario de Citas</h1>
        {(user?.roleName === "admin" || user?.roleName === "patient") && (
          <Button onClick={onNewAppointment}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        )}
      </div>

      {/* Calendar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CalendarHeader
              currentDate={currentDate}
              onPreviousMonth={() => navigateMonth("prev")}
              onNextMonth={() => navigateMonth("next")}
            />
          </CardHeader>
          <CardContent>
            <CalendarGrid
              days={days}
              selectedDate={selectedDate}
              onSelectDate={selectDate}
            />
          </CardContent>
        </Card>

        {/* Appointments List Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {formatAppointmentDate(new Date(selectedDate + "T00:00:00"))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <AppointmentList
                appointments={appointments}
                onAppointmentClick={onAppointmentClick}
                itemProps={{
                  showPatient: user?.roleName !== "patient",
                  showDoctor: user?.roleName !== "doctor",
                  showType: true,
                  showDuration: true,
                  showNotes: true,
                }}
                emptyMessage="No hay citas programadas para este día."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
