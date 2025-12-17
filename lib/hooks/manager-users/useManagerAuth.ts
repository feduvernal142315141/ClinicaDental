"use client";

import { useState, useCallback } from "react";
import {
  serviceManagerLogin,
  serviceValidateOtp,
  serviceManagerLogout,
  serviceRefreshToken,
  serviceForgotPassword,
  serviceResetPassword,
} from "@/lib/services/manager-users";
import {
  LoginRequest,
  LoginResponse,
  ValidateOtpResponse,
  ForgotPasswordResponse,
  AuthManagerUser,
} from "@/lib/entity/manager-users";

// Storage keys for tokens
const STORAGE_KEYS = {
  ACCESS_TOKEN: "manager_access_token",
  REFRESH_TOKEN: "manager_refresh_token",
  USER_DATA: "manager_user_data",
} as const;

interface UseManagerAuthReturn {
  // State
  isLoading: boolean;
  error: string | null;
  otpData: LoginResponse | null;
  user: AuthManagerUser | null;
  isAuthenticated: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  validateOtp: (email: string, otpCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<ForgotPasswordResponse | null>;
  resetPassword: (code: string, password: string) => Promise<boolean>;
  clearError: () => void;
  clearOtpData: () => void;
}

/**
 * Hook for managing manager user authentication
 *
 * @example
 * const {
 *   login,
 *   validateOtp,
 *   logout,
 *   isAuthenticated,
 *   user,
 *   isLoading,
 *   error
 * } = useManagerAuth();
 *
 * // Step 1: Login (sends OTP)
 * const success = await login({ email, password });
 *
 * // Step 2: Validate OTP
 * if (success) {
 *   const authenticated = await validateOtp(email, otpCode);
 * }
 */
export function useManagerAuth(): UseManagerAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpData, setOtpData] = useState<LoginResponse | null>(null);
  const [user, setUser] = useState<AuthManagerUser | null>(() => {
    // Initialize from storage on mount
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const isAuthenticated = user !== null;

  /**
   * Saves auth data to storage
   */
  const saveToStorage = useCallback((authUser: AuthManagerUser) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authUser.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authUser.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(authUser));
  }, []);

  /**
   * Clears auth data from storage
   */
  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }, []);

  /**
   * Login - sends OTP to email
   */
  const login = useCallback(
    async (credentials: LoginRequest): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceManagerLogin(credentials);

        if (response.status === 200) {
          setOtpData(response.data);
          return true;
        }

        setError(response.data?.message || "Error al iniciar sesión");
        return false;
      } catch (err) {
        setError("Error de conexión");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Validate OTP and get tokens
   */
  const validateOtp = useCallback(
    async (email: string, otpCode: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceValidateOtp({ email, otpCode });

        if (response.status === 200) {
          const tokenData = response.data as ValidateOtpResponse;

          // Create auth user object
          const authUser: AuthManagerUser = {
            id: "", // Will be populated from user details API
            names: "",
            surnames: "",
            email,
            role: { id: "", name: "", permissions: [] },
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            accessTokenExpiresIn: tokenData.accessTokenExpiresIn,
            refreshTokenExpiresIn: tokenData.refreshTokenExpiresIn,
            passwordExpirationDate: tokenData.passwordExpirationDate,
          };

          setUser(authUser);
          saveToStorage(authUser);
          setOtpData(null);
          return true;
        }

        setError(response.data?.message || "Código OTP inválido");
        return false;
      } catch (err) {
        setError("Error de conexión");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [saveToStorage]
  );

  /**
   * Logout - invalidates refresh token
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      if (user?.refreshToken) {
        await serviceManagerLogout({ refreshToken: user.refreshToken });
      }
    } catch (err) {
      console.error("Error during logout:", err);
    } finally {
      setUser(null);
      clearStorage();
      setIsLoading(false);
    }
  }, [user?.refreshToken, clearStorage]);

  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!user?.refreshToken) return false;

    try {
      const response = await serviceRefreshToken({
        refreshToken: user.refreshToken,
      });

      if (response.status === 200) {
        const newTokens = response.data;
        const updatedUser: AuthManagerUser = {
          ...user,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          accessTokenExpiresIn: newTokens.accessExpiresIn,
          refreshTokenExpiresIn: newTokens.refreshExpiresIn,
        };

        setUser(updatedUser);
        saveToStorage(updatedUser);
        return true;
      }

      // Token refresh failed, logout
      await logout();
      return false;
    } catch (err) {
      await logout();
      return false;
    }
  }, [user, saveToStorage, logout]);

  /**
   * Forgot password - sends recovery email
   */
  const forgotPassword = useCallback(
    async (email: string): Promise<ForgotPasswordResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceForgotPassword({ email });

        if (response.status === 200) {
          return response.data;
        }

        setError(
          response.data?.message || "Error al enviar correo de recuperación"
        );
        return null;
      } catch (err) {
        setError("Error de conexión");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Reset password with verification code
   */
  const resetPassword = useCallback(
    async (code: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await serviceResetPassword({ code, password });

        if (response.status === 200) {
          return true;
        }

        setError(response.data?.message || "Error al restablecer contraseña");
        return false;
      } catch (err) {
        setError("Error de conexión");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => setError(null), []);

  /**
   * Clear OTP data
   */
  const clearOtpData = useCallback(() => setOtpData(null), []);

  return {
    // State
    isLoading,
    error,
    otpData,
    user,
    isAuthenticated,

    // Actions
    login,
    validateOtp,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    clearError,
    clearOtpData,
  };
}
