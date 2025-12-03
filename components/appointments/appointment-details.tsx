"use client"

import { useState } from "react"
import { Button } from "@/components/ui/primitives/shadcn/button"
import { Badge } from "@/components/ui/atomic/data-display/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/atomic/data-display/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/atomic/forms/select"
import { useAuth } from "@/contexts/auth-context"
import { Calendar, Clock, User, Stethoscope, FileText } from "lucide-react"
import { Appointment } from "@/lib/entity/appointment/appointments"
import { updateAppointmentStatus } from "@/lib/supabase/appointments"

interface AppointmentDetailsProps {
  appointment: Appointment
  onClose: () => void
  onUpdate: () => void
}

export function AppointmentDetails({ appointment, onClose, onUpdate }: AppointmentDetailsProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleStatusUpdate = async (newStatus: Appointment["status"]) => {
    setLoading(true)
    try {
      await updateAppointmentStatus(appointment.id, newStatus)
      onUpdate()
    } catch (error) {
      console.error("Error updating appointment:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "no-show":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const canUpdateStatus = user?.roleName === "admin" || user?.roleName === "doctor"

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Detalles de la Cita</CardTitle>
          <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Fecha</p>
                <p className="text-sm text-muted-foreground">{formatDate(appointment.date)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Hora</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.time} ({appointment.duration} min)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Paciente</p>
                <p className="text-sm text-muted-foreground">{appointment.patientName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Doctor</p>
                <p className="text-sm text-muted-foreground">{appointment.doctorName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Tipo de consulta:</span>
            <span className="capitalize">{appointment.type}</span>
          </div>
        </div>

        {appointment.notes && (
          <div className="space-y-2">
            <p className="font-medium">Notas:</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{appointment.notes}</p>
          </div>
        )}

        {canUpdateStatus && (
          <div className="space-y-3">
            <p className="font-medium">Actualizar estado:</p>
            <div className="flex space-x-2">
              <Select defaultValue={appointment.status} onValueChange={handleStatusUpdate} disabled={loading}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programada</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="no-show">No se presentó</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex space-x-4 pt-4">
          <Button onClick={onClose} className="flex-1">
            Cerrar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
