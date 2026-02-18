import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { App } from "antd";
import { doctorsService } from "@/lib/services/doctors";
import { useAppointments } from "@/lib/hooks/appointments/useAppointments";
import { useAppointmentsPage } from "@/lib/hooks/appointments/use-appointments-page";
import type { AvailabilitySlot } from "@/lib/entity/appointment";

export interface AvailabilityDoctorOption {
  id: string;
  name: string;
  label: string;
}

interface UseAppointmentAvailabilityParams {
  basePath?: string;
  defaultDate?: string;
  defaultInterval?: number;
}

export function useAppointmentAvailability({
  basePath = "/appointments",
  defaultDate,
  defaultInterval = 15,
}: UseAppointmentAvailabilityParams = {}) {
  const { message } = App.useApp();
  const { getDoctorAvailability } = useAppointments();
  const { handleNewAppointmentPrefilled } = useAppointmentsPage({ basePath });

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    defaultDate?.split("T")[0] ?? dayjs().format("YYYY-MM-DD"),
  );
  const [selectedInterval, setSelectedInterval] = useState<number>(
    defaultInterval,
  );
  const [doctorsOptions, setDoctorsOptions] = useState<AvailabilityDoctorOption[]>(
    [],
  );
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  const hasRequiredFilters = useMemo(
    () => Boolean(selectedDoctorId && selectedDate),
    [selectedDoctorId, selectedDate],
  );

  const selectedDoctor = useMemo(
    () => doctorsOptions.find((option) => option.id === selectedDoctorId),
    [doctorsOptions, selectedDoctorId],
  );

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    try {
      const response = await doctorsService.getDoctors({ page: 0, pageSize: 100 });
      const options = (response.entities ?? []).map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        label: `${doctor.name}${doctor.specialty ? ` - ${doctor.specialty}` : ""}`,
      }));
      setDoctorsOptions(options);
    } catch (error) {
      setDoctorsOptions([]);
      const errorMessage =
        error instanceof Error ? error.message : "Error al cargar doctores";
      message.error(errorMessage);
    } finally {
      setDoctorsLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    const run = async () => {
      if (!hasRequiredFilters) {
        setSlots([]);
        return;
      }

      setAvailabilityLoading(true);
      try {
        const times = await getDoctorAvailability(
          selectedDoctorId,
          selectedDate,
          selectedInterval,
        );

        setSlots(
          times.map((time) => ({
            id: `${selectedDoctorId}-${selectedDate}-${time}-${selectedInterval}`,
            doctorId: selectedDoctorId,
            doctorName: selectedDoctor?.name,
            date: selectedDate,
            time,
            interval: selectedInterval,
          })),
        );
      } catch {
        setSlots([]);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    run();
  }, [
    getDoctorAvailability,
    hasRequiredFilters,
    selectedDate,
    selectedDoctor?.name,
    selectedDoctorId,
    selectedInterval,
  ]);

  const scheduleSlot = useCallback(
    (slot: AvailabilitySlot) => {
      handleNewAppointmentPrefilled({
        doctorId: slot.doctorId,
        date: slot.date,
        time: slot.time,
        interval: slot.interval,
      });
    },
    [handleNewAppointmentPrefilled],
  );

  return {
    selectedDoctorId,
    selectedDate,
    selectedInterval,
    doctorsOptions,
    doctorsLoading,
    availabilityLoading,
    slots,
    hasRequiredFilters,
    setSelectedDoctorId,
    setSelectedDate,
    setSelectedInterval,
    scheduleSlot,
  };
}
