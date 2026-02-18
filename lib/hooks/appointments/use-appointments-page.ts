import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseAppointmentsPageOptions {
  basePath?: string;
}

interface HandleNewAppointmentPrefilledParams {
  doctorId: string;
  date: string;
  time: string;
  interval?: number;
  patientId?: string;
}

export function useAppointmentsPage(options: UseAppointmentsPageOptions = {}) {
  const { basePath = "/appointments" } = options;
  const router = useRouter();

  const handleNewAppointment = useCallback(() => {
    router.push(`${basePath}/new`);
  }, [router, basePath]);

  const handleNewAppointmentPrefilled = useCallback(
    ({ doctorId, date, time, interval, patientId }: HandleNewAppointmentPrefilledParams) => {
      const query = new URLSearchParams({
        doctorId,
        date,
        time,
      });

      if (interval !== undefined) {
        query.set("interval", String(interval));
      }

      if (patientId) {
        query.set("patientId", patientId);
      }

      router.push(`${basePath}/new?${query.toString()}`);
    },
    [router, basePath],
  );

  const handleViewAppointment = useCallback(
    (appointmentId: string) => {
      router.push(`${basePath}/${appointmentId}`);
    },
    [router, basePath],
  );

  const handleEditAppointment = useCallback(
    (appointmentId: string) => {
      router.push(`${basePath}/${appointmentId}/edit`);
    },
    [router, basePath],
  );

  const handleBackToList = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return {
    handleNewAppointment,
    handleNewAppointmentPrefilled,
    handleViewAppointment,
    handleEditAppointment,
    handleBackToList,
  };
}
