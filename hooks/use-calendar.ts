/**
 * USE CALENDAR HOOK
 *
 * Custom hook para manejar la lógica del calendario de citas
 * Separa la lógica de negocio de la presentación
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Appointment } from "@/lib/entity/appointment/appointments";
import { getAppointmentsByDate } from "@/lib/supabase/appointments";
import { toISODateString } from "@/lib/utils/appointment-utils";

export function useCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(toISODateString(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Calcula todos los días del mes actual incluyendo espacios vacíos
   */
  const getDaysInMonth = useCallback((date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Espacios vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, []);

  /**
   * Navega al mes anterior o siguiente
   */
  const navigateMonth = useCallback((direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  /**
   * Selecciona una fecha específica
   */
  const selectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
  }, []);

  /**
   * Carga las citas para la fecha seleccionada
   */
  const fetchAppointments = useCallback(async () => {
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
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, user?.clinicId]);

  /**
   * Recarga las citas (útil después de crear/actualizar)
   */
  const refetchAppointments = useCallback(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Efecto para cargar citas cuando cambia la fecha o clinicId
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    // Estado
    currentDate,
    selectedDate,
    appointments,
    loading,

    // Métodos
    getDaysInMonth,
    navigateMonth,
    selectDate,
    refetchAppointments,
  };
}
