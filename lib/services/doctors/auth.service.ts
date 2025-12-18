import { serviceGet, servicePost } from "../baseService";
import type {
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from "@/lib/entity/doctors";

/**
 * DoctorAuthService
 *
 * Service for managing doctor authentication
 * Base endpoints: /auth/*
 */

/**
 * Login doctor
 * POST /auth/login
 */
async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await servicePost<LoginRequest, LoginResponse>(
    "/auth/login",
    credentials
  );
  if (response?.data) {
    return response.data;
  }
  throw new Error("Error al iniciar sesión");
}

/**
 * Logout doctor
 * POST /auth/logout
 */
async function logout(): Promise<void> {
  const response = await servicePost("/auth/logout", {});
  if (!response?.data) {
    throw new Error("Error al cerrar sesión");
  }
}

/**
 * Request password reset
 * POST /auth/forgot-password
 */
async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  const response = await servicePost("/auth/forgot-password", data);
  if (!response?.data) {
    throw new Error("Error al solicitar restablecimiento");
  }
}

/**
 * Reset password with token
 * POST /auth/reset-password
 */
async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  const response = await servicePost("/auth/reset-password", data);
  if (!response?.data) {
    throw new Error("Error al restablecer contraseña");
  }
}

/**
 * Change password (authenticated)
 * POST /auth/change-password
 */
async function changePassword(data: ChangePasswordRequest): Promise<void> {
  const response = await servicePost("/auth/change-password", data);
  if (!response?.data) {
    throw new Error("Error al cambiar contraseña");
  }
}

/**
 * Verify reset token validity
 * GET /auth/verify-token/:token
 */
async function verifyResetToken(token: string): Promise<boolean> {
  try {
    await serviceGet(`/auth/verify-token/${token}`);
    return true;
  } catch (error) {
    return false;
  }
}

export const doctorAuthService = {
  login,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyResetToken,
};
