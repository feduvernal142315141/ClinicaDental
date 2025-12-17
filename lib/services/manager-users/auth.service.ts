/**
 * Manager Users Authentication Service
 *
 * Handles all authentication-related API calls for manager users:
 * - Login (OTP request)
 * - OTP validation
 * - Token refresh
 * - Logout
 * - Password recovery
 */

import { servicePost } from "@/lib/services/baseService";
import { ServiceResponse } from "@/lib/models/response";
import {
  LoginRequest,
  LoginResponse,
  ValidateOtpRequest,
  ValidateOtpResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
} from "@/lib/entity/manager-users";

// Base path for auth endpoints
const AUTH_BASE_PATH = "/managers-users/auth";

/**
 * Initiates login process by sending OTP to user's email
 * @param credentials User email and password
 * @returns OTP expiration info (code only visible in dev environment)
 */
export const serviceManagerLogin = async (
  credentials: LoginRequest
): ServiceResponse<LoginResponse> => {
  return servicePost<LoginRequest, LoginResponse>(
    `${AUTH_BASE_PATH}/login`,
    credentials
  );
};

/**
 * Validates OTP code and returns access tokens
 * @param data Email and OTP code
 * @returns Access and refresh tokens with expiration dates
 */
export const serviceValidateOtp = async (
  data: ValidateOtpRequest
): ServiceResponse<ValidateOtpResponse> => {
  return servicePost<ValidateOtpRequest, ValidateOtpResponse>(
    `${AUTH_BASE_PATH}/validate-otp`,
    data
  );
};

/**
 * Refreshes the access token using refresh token
 * @param data Refresh token
 * @returns New access and refresh tokens
 */
export const serviceRefreshToken = async (
  data: RefreshTokenRequest
): ServiceResponse<RefreshTokenResponse> => {
  return servicePost<RefreshTokenRequest, RefreshTokenResponse>(
    `${AUTH_BASE_PATH}/refresh-token`,
    data
  );
};

/**
 * Invalidates the refresh token (logout)
 * @param data Refresh token to invalidate
 * @returns true if successful
 */
export const serviceManagerLogout = async (
  data: LogoutRequest
): ServiceResponse<boolean> => {
  return servicePost<LogoutRequest, boolean>(`${AUTH_BASE_PATH}/logout`, data);
};

/**
 * Initiates password recovery process
 * @param data User email
 * @returns User info if email exists
 */
export const serviceForgotPassword = async (
  data: ForgotPasswordRequest
): ServiceResponse<ForgotPasswordResponse> => {
  return servicePost<ForgotPasswordRequest, ForgotPasswordResponse>(
    `${AUTH_BASE_PATH}/forgot-password`,
    data
  );
};

/**
 * Resets password using verification code
 * @param data Verification code and new password
 * @returns true if successful
 */
export const serviceResetPassword = async (
  data: ResetPasswordRequest
): ServiceResponse<boolean> => {
  return servicePost<ResetPasswordRequest, boolean>(
    `${AUTH_BASE_PATH}/reset-password`,
    data
  );
};
