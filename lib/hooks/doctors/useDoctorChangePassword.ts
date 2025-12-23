import { useCallback, useState } from "react";
import { App } from "antd";
import { doctorsService } from "@/lib/services/doctors";
import type { DoctorChangePasswordRequest } from "@/lib/entity/doctors";

export function useDoctorChangePassword() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const changeDoctorPassword = useCallback(
    async (data: DoctorChangePasswordRequest) => {
      setLoading(true);
      try {
        await doctorsService.changeDoctorPassword(data);
        message.success("Contraseña cambiada exitosamente");
      } catch (error: any) {
        message.error(error.message || "Error al cambiar contraseña");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  return {
    loading,
    changeDoctorPassword,
  };
}
