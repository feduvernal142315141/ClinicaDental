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
}

export function useAppointmentsPage(options: UseAppointmentsPageOptions = {}) {
  const { basePath = "/appointments" } = options;
  const router = useRouter();

  const handleNewAppointment = useCallback(() => {
    router.push(`${basePath}/new`);
  }, [router, basePath]);

  const handleNewAppointmentPrefilled = useCallback(
    ({ doctorId, date, time, interval }: HandleNewAppointmentPrefilledParams) => {
      const query = new URLSearchParams({
        doctorId,
        date,
        time,
      });

      if (interval !== undefined) {
        query.set("interval", String(interval));
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
