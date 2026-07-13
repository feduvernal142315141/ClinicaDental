import { serviceGet, servicePost } from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import { encryptPasswordForTransport } from "@/lib/auth/password-encryption";
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
  // Password cifrado con RSA (defensa en profundidad SOBRE TLS): no viaja legible en el
  // cuerpo. El backend lo descifra; en reposo sigue siendo BCrypt. Ver password-encryption.
  const encryptedPassword = await encryptPasswordForTransport(credentials.password);
  const response = await servicePost<LoginRequest, LoginResponse>(
    "/auth/login",
    { email: credentials.email, password: encryptedPassword },
  );

  const status = response?.status;
  const data: unknown = response?.data;

  if (!status) handleServiceError(typeof response !== "undefined" ? response : null, "Network error during login");

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

  // servicePost swallows errors and returns err.response — check status explicitly
  if (response?.status === 401 || response?.status === 400) {
    throw new Error("Código incorrecto. Verifica el código e inténtalo de nuevo.");
  }

  if (response?.data) {
    return response.data;
  }

  throw new Error("Código incorrecto. Verifica el código e inténtalo de nuevo.");
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
  handleServiceError(typeof response !== "undefined" ? response : null, "Error al refrescar la sesión");
}

/**
 * Logout doctor
 * POST /auth/logout
 */
async function logout(data: { refreshToken: string }): Promise<void> {
  const response = await servicePost("/auth/logout", data);
  if (!response?.data) {
    handleServiceError(typeof response !== "undefined" ? response : null, "Error al cerrar sesión");
  }
}

/**
 * Request password reset
 * POST /auth/forgot-password
 */
async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  const response = await servicePost("/auth/forgot-password", data);
  if (!response?.data) {
    handleServiceError(typeof response !== "undefined" ? response : null, "Error al solicitar restablecimiento");
  }
}

/**
 * Reset password with token
 * POST /auth/reset-password
 */
async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  // Password cifrado con RSA en tránsito (el backend lo descifra). El `code` es un token, no viaja password en claro.
  const password = await encryptPasswordForTransport(data.password);
  const response = await servicePost("/auth/reset-password", { ...data, password });
  if (!response?.data) {
    handleServiceError(typeof response !== "undefined" ? response : null, "Error al restablecer contraseña");
  }
}

/**
 * Change password (authenticated)
 * POST /auth/change-password
 */
async function changePassword(data: ChangePasswordRequest): Promise<void> {
  // Ambos passwords cifrados con RSA en tránsito (el backend los descifra).
  const [oldPassword, newPassword] = await Promise.all([
    encryptPasswordForTransport(data.oldPassword),
    encryptPasswordForTransport(data.newPassword),
  ]);
  const response = await servicePost("/auth/change-password", { oldPassword, newPassword });
  if (!response?.data) {
    handleServiceError(typeof response !== "undefined" ? response : null, "Error al cambiar contraseña");
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
