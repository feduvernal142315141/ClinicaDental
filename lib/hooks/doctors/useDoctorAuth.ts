import { useState, useCallback } from "react";
import { App } from "antd";
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

/**
 * useDoctorAuth Hook
 *
 * Hook for managing doctor authentication operations
 */
export function useDoctorAuth() {
  const { message } = App.useApp();
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
        message.success("Código enviado. Verifica tu correo");
        return response;
      } catch (error: any) {
        message.error(error.message || "Error al iniciar sesión");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Validate OTP
   */
  const validateOtp = useCallback(
    async (data: ValidateOtpRequest): Promise<ValidateOtpResponse> => {
      setLoading(true);
      try {
        const response = await doctorAuthService.validateOtp(data);
        message.success("OTP validado correctamente");
        return response;
      } catch (error: any) {
        message.error(error.message || "Error al validar OTP");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
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
      } catch (error: any) {
        message.error(error.message || "Error al refrescar la sesión");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Logout doctor
   */
  const logout = useCallback(
    async (refreshTokenValue: string) => {
      setLoading(true);
      try {
        await doctorAuthService.logout({ refreshToken: refreshTokenValue });
        message.success("Sesión cerrada exitosamente");
      } catch (error: any) {
        message.error(error.message || "Error al cerrar sesión");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Request password reset
   */
  const forgotPassword = useCallback(
    async (data: ForgotPasswordRequest) => {
      setLoading(true);
      try {
        await doctorAuthService.forgotPassword(data);
        message.success(
          "Se ha enviado un correo con instrucciones para restablecer tu contraseña"
        );
      } catch (error: any) {
        message.error(
          error.message || "Error al solicitar restablecimiento de contraseña"
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Reset password with token
   */
  const resetPassword = useCallback(
    async (data: ResetPasswordRequest) => {
      setLoading(true);
      try {
        await doctorAuthService.resetPassword(data);
        message.success("Contraseña restablecida exitosamente");
      } catch (error: any) {
        message.error(error.message || "Error al restablecer contraseña");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * Change password (authenticated user)
   */
  const changePassword = useCallback(
    async (data: ChangePasswordRequest) => {
      setLoading(true);
      try {
        await doctorAuthService.changePassword(data);
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

  /**
   * Verify reset token
   */
  const verifyResetToken = useCallback(
    async (token: string): Promise<boolean> => {
      setLoading(true);
      try {
        const isValid = await doctorAuthService.verifyResetToken(token);
        return isValid;
      } catch (error: any) {
        message.error(error.message || "Token inválido o expirado");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [message]
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
