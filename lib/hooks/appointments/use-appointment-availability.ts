import { useCallback, useEffect, useMemo, useState } from "react";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
import dayjs, { type Dayjs } from "dayjs";
import { doctorsService } from "@/lib/services/doctors";
import { useAppointments } from "@/lib/hooks/appointments/useAppointments";
import { useAppointmentsPage } from "@/lib/hooks/appointments/use-appointments-page";
import { buildDisabledDate } from "@/lib/utils/appointment-utils";
import type { AvailabilitySlot } from "@/lib/entity/appointment";
import type { WeekSchedule } from "@/lib/entity/schedule";
import { useClinicGeneralSettings } from "@/lib/hooks/settings/use-clinic-general-settings";

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
  const { getDoctorAvailability } = useAppointments();
  const { handleNewAppointmentPrefilled } = useAppointmentsPage({ basePath });

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    defaultDate?.split("T")[0] ?? dayjs().format("YYYY-MM-DD"),
  );
  const [selectedInterval, setSelectedInterval] =
    useState<number>(defaultInterval);
  const [doctorsOptions, setDoctorsOptions] = useState<
    AvailabilityDoctorOption[]
  >([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [doctorSchedule, setDoctorSchedule] = useState<
    WeekSchedule | Record<string, unknown> | null
  >(null);

  // Horario EFECTIVO = doctor ∩ clínica (paridad con el backend).
  const { rawSchedule: clinicSchedule } = useClinicGeneralSettings();

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
      const response = await doctorsService.getDoctors({
        page: 0,
        pageSize: 100,
      });
      const options = (response.entities ?? []).map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        label: `${doctor.name}${doctor.specialty ? ` - ${doctor.specialty}` : ""}`,
      }));
      setDoctorsOptions(options);
    } catch {
      setDoctorsOptions([]);
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Cargar schedule del doctor seleccionado
  useEffect(() => {
    if (!selectedDoctorId) {
      setDoctorSchedule(null);
      return;
    }

    let cancelled = false;
    const loadSchedule = async () => {
      try {
        const doctor = await doctorsService.getDoctorById(selectedDoctorId);
        if (!cancelled) {
          setDoctorSchedule(
            (doctor.schedule as WeekSchedule | Record<string, unknown>) ?? null,
          );
        }
      } catch {
        if (!cancelled) setDoctorSchedule(null);
      }
    };

    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [selectedDoctorId]);

  /** Función para deshabilitar fechas en el calendario según el schedule del doctor */
  const disabledDate = useMemo(
    () => buildDisabledDate(doctorSchedule, clinicSchedule),
    [doctorSchedule, clinicSchedule],
  );

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
    disabledDate,
    setSelectedDoctorId,
    setSelectedDate,
    setSelectedInterval,
    scheduleSlot,
  };
}
