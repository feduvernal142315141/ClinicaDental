/**
 * USE APPOINTMENT FORM SUMMARY HOOK
 *
 * Custom hook para manejar la lógica del resumen del formulario de citas
 * Separa la lógica de negocio de la presentación
 */

import { useState, useMemo } from "react";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import type { SummaryItem } from "@/components/ui/atomic/data-display/summary-card";

export function useAppointmentFormSummary() {
  const [formData, setFormData] = useState<Partial<Appointment>>({});

  /**
   * Actualiza los datos del formulario
   */
  const handleFormChange = (data: Partial<Appointment>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  /**
   * Maneja la selección de fecha desde el calendario
   */
  const handleDateSelect = (date: string) => {
    handleFormChange({ date });
  };

  /**
   * Genera los items del resumen basados en formData
   * Usa useMemo para evitar recalcular en cada render
   */
  const summaryItems = useMemo<SummaryItem[]>(
    () => [
      {
        label: "Paciente",
        value: formData.patientName,
        defaultValue: "No seleccionado",
      },
      {
        label: "Doctor",
        value: formData.doctorName,
        defaultValue: "No seleccionado",
      },
      {
        label: "Fecha",
        value: formData.date,
        defaultValue: "—",
      },
      {
        label: "Hora",
        value: formData.time,
        defaultValue: "—",
      },
      {
        label: "Duración",
        value: formData.duration,
        formatter: (val) => `${val} min`,
        defaultValue: "30 min",
      },
      {
        label: "Tipo",
        value: formData.type,
        defaultValue: "consulta",
      },
      {
        label: "Notas",
        value: formData.notes,
        defaultValue: "—",
      },
    ],
    [
      formData.patientName,
      formData.doctorName,
      formData.date,
      formData.time,
      formData.duration,
      formData.type,
      formData.notes,
    ]
  );

  return {
    formData,
    summaryItems,
    handleFormChange,
    handleDateSelect,
  };
}
