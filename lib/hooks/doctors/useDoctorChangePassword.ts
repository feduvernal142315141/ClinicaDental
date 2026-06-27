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
        notify.success("Contraseña cambiada exitosamente");
      } catch (error: unknown) {
        notify.error(error.message || "Error al cambiar contraseña");
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
