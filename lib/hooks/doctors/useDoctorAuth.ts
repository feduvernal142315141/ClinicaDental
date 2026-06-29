import { useState, useCallback } from "react";

import { doctorAuthService } from "@/lib/services/doctors";
import type {
  LoginRequest,
  LoginResponse,
  ValidateOtpRequest,
  ValidateOtpResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from "@/lib/entity/doctors";
import { notify } from "@/lib/utils/notify";

/**
 * useDoctorAuth Hook
 *
 * Hook for managing doctor authentication operations
 */
export function useDoctorAuth() {
  const [loading, setLoading] = useState(false);

  /**
   * Login doctor
   */
  const login = useCallback(
    async (credentials: LoginRequest): Promise<LoginResponse> => {
      setLoading(true);
      try {
        const response = await doctorAuthService.login(credentials);
        // En este proyecto el login inicia el flujo OTP
        notify.success("Código de verificación enviado", {
          description:
            "Te enviamos un código a tu correo. Revísalo e ingrésalo para completar el inicio de sesión.",
        });
        return response;
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo iniciar sesión", {
          description:
            "Verifica tu correo y contraseña e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Validate OTP
   */
  const validateOtp = useCallback(
    async (data: ValidateOtpRequest): Promise<ValidateOtpResponse> => {
      setLoading(true);
      try {
        const response = await doctorAuthService.validateOtp(data);
        notify.success("Código verificado", {
          description:
            "Tu identidad fue confirmada. Estamos preparando tu acceso a la plataforma.",
        });
        return response;
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo verificar el código", {
          description:
            "El código es incorrecto o ya expiró. Revísalo o solicita uno nuevo e inténtalo otra vez.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Refresh token
   */
  const refreshToken = useCallback(
    async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
      setLoading(true);
      try {
        const response = await doctorAuthService.refreshToken(data);
        return response;
      } catch (error: unknown) {
        notify.error(error.message || "Tu sesión expiró", {
          description:
            "No pudimos renovar tu sesión. Vuelve a iniciar sesión para continuar trabajando.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Logout doctor
   */
  const logout = useCallback(
    async (refreshTokenValue: string) => {
      setLoading(true);
      try {
        await doctorAuthService.logout({ refreshToken: refreshTokenValue });
        notify.success("Sesión cerrada", {
          description:
            "Cerraste sesión de forma segura. Vuelve a iniciar sesión cuando quieras continuar.",
        });
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo cerrar la sesión", {
          description:
            "Ocurrió un problema al cerrar tu sesión. Revisa tu conexión e inténtalo de nuevo.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Request password reset
   */
  const forgotPassword = useCallback(
    async (data: ForgotPasswordRequest) => {
      setLoading(true);
      try {
        await doctorAuthService.forgotPassword(data);
        notify.success("Correo de recuperación enviado", {
          description:
            "Te enviamos instrucciones para restablecer tu contraseña. Revisa tu bandeja y la carpeta de spam.",
        });
      } catch (error: unknown) {
        notify.error(
          error.message || "No se pudo enviar el correo de recuperación",
          {
            description:
              "Verifica que el correo sea correcto e inténtalo de nuevo; si persiste, contacta a soporte.",
          }
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Reset password with token
   */
  const resetPassword = useCallback(
    async (data: ResetPasswordRequest) => {
      setLoading(true);
      try {
        await doctorAuthService.resetPassword(data);
        notify.success("Contraseña restablecida", {
          description:
            "Tu nueva contraseña ya está activa. Inicia sesión con ella para acceder a tu cuenta.",
        });
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo restablecer la contraseña", {
          description:
            "El enlace pudo haber expirado. Solicita uno nuevo e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Change password (authenticated user)
   */
  const changePassword = useCallback(
    async (data: ChangePasswordRequest) => {
      setLoading(true);
      try {
        await doctorAuthService.changePassword(data);
        notify.success("Contraseña actualizada", {
          description:
            "Tu contraseña se cambió correctamente. Úsala la próxima vez que inicies sesión.",
        });
      } catch (error: unknown) {
        notify.error(error.message || "No se pudo cambiar la contraseña", {
          description:
            "Comprueba que tu contraseña actual sea correcta e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Verify reset token
   */
  const verifyResetToken = useCallback(
    async (token: string): Promise<boolean> => {
      setLoading(true);
      try {
        const isValid = await doctorAuthService.verifyResetToken(token);
        return isValid;
      } catch (error: unknown) {
        notify.error(error.message || "El enlace ya no es válido", {
          description:
            "El enlace para restablecer tu contraseña expiró o ya se usó. Solicita uno nuevo para continuar.",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    login,
    validateOtp,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyResetToken,
  };
}
