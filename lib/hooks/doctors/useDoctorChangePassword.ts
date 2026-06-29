import { useCallback, useState } from "react";

import { doctorsService } from "@/lib/services/doctors";
import type { DoctorChangePasswordRequest } from "@/lib/entity/doctors";
import { notify } from "@/lib/utils/notify";

export function useDoctorChangePassword() {
  const [loading, setLoading] = useState(false);

  const changeDoctorPassword = useCallback(
    async (data: DoctorChangePasswordRequest) => {
      setLoading(true);
      try {
        await doctorsService.changeDoctorPassword(data);
        notify.success("Contraseña actualizada", {
          description:
            "Tu nueva contraseña ya está activa. Úsala la próxima vez que inicies sesión.",
        });
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo cambiar la contraseña", {
          description:
            "Verifica que la contraseña actual sea correcta e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    changeDoctorPassword,
  };
}
