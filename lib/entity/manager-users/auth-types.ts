// ============================================
// AUTHENTICATION TYPES - Manager Users
// ============================================

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response from login endpoint (OTP sent)
 */
export interface LoginResponse {
  otpCode?: string; // Only visible in development environment
  otpExpiresInSeconds: number;
  otpExpiresAt: string;
}

/**
 * OTP validation request payload
 */
export interface ValidateOtpRequest {
  email: string;
  otpCode: string;
}

/**
 * Response from OTP validation (tokens)
 */
export interface ValidateOtpResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  passwordExpirationDate: string;
}

/**
 * Refresh token request payload
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Response from refresh token endpoint
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

/**
 * Logout request payload
 */
export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Forgot password request payload
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Response from forgot password endpoint
 */
export interface ForgotPasswordResponse {
  name: string;
  email: string;
}

/**
 * Reset password request payload
 */
export interface ResetPasswordRequest {
  code: string;
  password: string;
}

// ============================================
// AUTH STATE TYPES (for context/store)
// ============================================

/**
 * Authenticated manager user state
 */
export interface AuthManagerUser {
  id: string;
  names: string;
  surnames: string;
  email: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  passwordExpirationDate: string;
}

/**
 * Auth state for context/store
 */
export interface ManagerAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthManagerUser | null;
  otpSent: boolean;
  otpExpiresAt: string | null;
  error: string | null;
}

// ============================================
// FORM DATA TYPES (for UI)
// ============================================

/**
 * Login form data
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * OTP form data
 */
export interface OtpFormData {
  otp: string;
}

/**
 * Forgot password form data
 */
export interface ForgotPasswordFormData {
  email: string;
}

/**
 * Reset password form data
 */
export interface ResetPasswordFormData {
  code: string;
  password: string;
  confirmPassword: string;
}
