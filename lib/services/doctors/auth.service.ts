import { serviceGet, servicePost } from "../baseService";
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

function isLoginResponse(data: unknown): data is LoginResponse {
  const candidate = data as LoginResponse | null | undefined;
  return (
    !!candidate &&
    typeof candidate.otpExpiresAt === "string" &&
    typeof candidate.otpExpiresInSeconds === "number"
  );
}

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
  // const encryptedPassword = await encryptPasswordForTransport(
  //   credentials.password
  // );

  const response = await servicePost<LoginRequest, LoginResponse>(
    "/auth/login",
    { ...credentials, password: credentials.password },
  );

  const status = response?.status;
  const data: unknown = response?.data;

  if (!status) throw new Error("Network error during login");

  if (status < 200 || status >= 300) {
    throw new Error(data?.message || "Login failed");
  }

  if (isLoginResponse(data)) {
    return data;
  }

  if (isLoginResponse(data?.data)) {
    return data.data;
  }

  throw new Error(data?.message || "Error al iniciar sesión");
}

/**
 * Validate OTP
 * POST /auth/validate-otp
 */
async function validateOtp(
  data: ValidateOtpRequest,
): Promise<ValidateOtpResponse> {
  const response = await servicePost<ValidateOtpRequest, ValidateOtpResponse>(
    "/auth/validate-otp",
    data,
  );
  if (response?.data) {
    return response.data;
  }
  throw new Error("Error al validar OTP");
}

/**
 * Refresh token
 * POST /auth/refresh-token
 */
async function refreshToken(
  data: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  const response = await servicePost<RefreshTokenRequest, RefreshTokenResponse>(
    "/auth/refresh-token",
    data,
  );
  if (response?.data) {
    return response.data;
  }
  throw new Error("Error al refrescar la sesión");
}

/**
 * Logout doctor
 * POST /auth/logout
 */
async function logout(data: { refreshToken: string }): Promise<void> {
  const response = await servicePost("/auth/logout", data);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return false;
  }
}

export const doctorAuthService = {
  login,
  validateOtp,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyResetToken,
};
