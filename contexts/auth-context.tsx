"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AppUser,
  AuthContextType,
  RegisterData,
  registerUser,
} from "@/lib/auth";
import { doctorAuthService } from "@/lib/services/doctors";
import {
  clearOtpSession,
  loadOtpSession,
  saveOtpPassword,
  saveOtpSession,
} from "@/lib/auth/otp-session";
import { getAccessToken } from "@/lib/auth/token-client";
import { decodeJwtPayload } from "@/lib/auth/jwt";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

    const roleName =
      (payload?.roleName as string | undefined) ||
      (payload?.role as string | undefined) ||
      "doctor";

    // No tenemos clinicId/roleId garantizados en el JWT; se dejan null.
    setUser({
      id: String((payload?.userId as string | undefined) ?? "jwt"),
      email,
      clinicId: null,
      roleId: null,
      roleName,
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

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo crear la sesión");
      }

      clearOtpSession();
      hydrateUserFromAccessToken(tokens.accessToken);

      if (shouldRedirect) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "OTP inválido");
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      const newUser = await registerUser(data);

      if (newUser) {
        const mappedUser: AppUser = {
          id: newUser.id,
          email: newUser.email ?? undefined,
          clinicId: null,
          roleId: null,
          roleName: "guest",
        };
        setUser(mappedUser);
      }
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
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error during logout:", error);
      // Aún así redirigir al login en caso de error
      setUser(null);
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
