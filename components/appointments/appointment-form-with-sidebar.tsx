"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/atomic/data-display/card"
import { AppointmentForm } from "@/components/appointments/appointment-form"
import type { Appointment } from "@/lib/entity/appointment/appointments"
import { MiniCalendar } from "./MiniCalendar"

interface AppointmentFormWithSidebarProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AppointmentFormWithSidebar({ onSuccess, onCancel }: AppointmentFormWithSidebarProps) {
  const [formData, setFormData] = useState<Partial<Appointment>>({})

  const handleFormChange = (data: Partial<Appointment>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      <div>
        <AppointmentForm
          onSuccess={onSuccess}
          onCancel={onCancel}
          // 👇 paso un callback para que el form avise cambios
          //onChange={handleFormChange}
        />
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Resumen de la cita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm m">
            <p><strong>Paciente:</strong> {formData.patientName || "No seleccionado"}</p>
            <p><strong>Doctor:</strong> {formData.doctorName || "No seleccionado"}</p>
            <p><strong>Fecha:</strong> {formData.date || "—"}</p>
            <p><strong>Hora:</strong> {formData.time || "—"}</p>
            <p><strong>Duración:</strong> {formData.duration ? `${formData.duration} min` : "30 min"}</p>
            <p><strong>Tipo:</strong> {formData.type || "consulta"}</p>
            <p><strong>Notas:</strong> {formData.notes || "—"}</p>
          </CardContent>
        </Card>

        <MiniCalendar
          doctorId={formData.doctor_id}
          onDateSelect={(date) => handleFormChange({ date })}
        />
      </div>
    </div>
  )
}
