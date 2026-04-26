"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AppUser, AuthContextType, RegisterData } from "@/lib/auth";
import { doctorAuthService } from "@/lib/services/doctors";
import {
  clearOtpSession,
  loadOtpSession,
  saveOtpPassword,
  saveOtpSession,
} from "@/lib/auth/otp-session";
import { getAccessToken } from "@/lib/auth/token-client";
import { decodeJwtPayload } from "@/lib/auth/jwt";
import { createAuthSession } from "@/lib/services/auth/session.service";
import { clearAuthTokens, saveLoggedUser } from "@/lib/auth/token-storage";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // TODO: quitar normalizeRoleName cuando el backend sea consistente
  const normalizeRoleName = (rawRole: unknown): string => {
    if (typeof rawRole !== "string") return "doctor";
    const normalized = rawRole.trim().toLowerCase();

    if (normalized.includes("admin")) return "admin";
    if (normalized.includes("doctor")) return "doctor";
    if (normalized.includes("patient")) return "patient";

    return "doctor";
  };

  const hydrateUserFromAccessToken = (accessToken: string | null) => {
    if (!accessToken) {
      setUser(null);
      return;
    }

    const payload = decodeJwtPayload(accessToken);
    const email =
      (payload?.email as string | undefined) ||
      (payload?.username as string | undefined) ||
      (payload?.sub as string | undefined);

    const rawRole =
      (payload?.roleName as string | undefined) ||
      (payload?.role as string | undefined) ||
      ((payload as unknown)?.rol as string | undefined);
    const roleName = normalizeRoleName(rawRole);

    const rawPermissions =
      (payload?.permissions as unknown) ??
      ((payload as unknown)?.Permissions as unknown) ??
      ((payload as unknown)?.permisos as unknown);

    const permissions = Array.isArray(rawPermissions)
      ? rawPermissions.filter((p): p is string => typeof p === "string")
      : undefined;

    setUser({
      id: String(
        (payload?.userId as string | undefined) ??
          ((payload as unknown)?.Id as string | undefined) ??
          ((payload as unknown)?.id as string | undefined) ??
          "jwt"
      ),
      email,
      clinicId: null,
      roleId: null,
      roleName,
      permissions,
    });
  };

  useEffect(() => {
    let ignore = false;

    const initAuth = async () => {
      try {
        if (ignore) return;
        const token = getAccessToken();
        hydrateUserFromAccessToken(token);
        setLoading(false);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const otp = await doctorAuthService.login({ email, password });
      saveOtpPassword(password);
      saveOtpSession({
        email,
        otpExpiresAt: otp.otpExpiresAt,
        otpExpiresInSeconds: otp.otpExpiresInSeconds,
      });

      router.push("/validate-otp");
      router.refresh();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Error de autenticación"
      );
    } finally {
      setLoading(false);
    }
  };

  const completeOtpLogin = async (
    otpCode: string,
    options?: {
      redirect?: boolean;
    }
  ) => {
    const shouldRedirect = options?.redirect !== false;
    setLoading(true);
    setAuthError(null);
    try {
      const session = loadOtpSession();
      if (!session?.email) {
        setAuthError("Sesión OTP no encontrada. Vuelve a iniciar sesión.");
        return;
      }

      const tokens = await doctorAuthService.validateOtp({
        email: session.email,
        otpCode,
      });

      await createAuthSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      saveLoggedUser(tokens);

      clearOtpSession();
      hydrateUserFromAccessToken(tokens.accessToken);

      if (shouldRedirect) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Código OTP incorrecto. Verifica el código e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      void data;
      setAuthError("Registro no implementado para el flujo OTP/JWT");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Error en el registro");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setUser(null);
      clearOtpSession();
      clearAuthTokens();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error during logout:", error);
      setUser(null);
      clearOtpSession();
      clearAuthTokens();
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        completeOtpLogin,
        logout,
        register,
        loading,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
