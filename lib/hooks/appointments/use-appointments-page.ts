import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseAppointmentsPageOptions {
  basePath?: string;
}

export function useAppointmentsPage(options: UseAppointmentsPageOptions = {}) {
  const { basePath = "/appointments" } = options;
  const router = useRouter();

  const handleNewAppointment = useCallback(() => {
    router.push(`${basePath}/new`);
  }, [router, basePath]);

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
    handleViewAppointment,
    handleEditAppointment,
    handleBackToList,
  };
}
