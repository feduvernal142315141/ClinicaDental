"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  AppUser,
  AuthContextType,
  RegisterData,
  registerUser,
} from "@/lib/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  type ClinicUserWithRole = {
    clinic_id: string;
    role_id: string;
    clinic_roles: { name: string };
  };

  const hydrateUser = async (session: any | null) => {
    try {
      if (session?.user) {
        const { data: clinicUser, error } = await supabase
          .from("clinic_users")
          .select("clinic_id, role_id, clinic_roles(name)")
          .eq("user_id", session.user.id)
          .single<ClinicUserWithRole>();

        if (error) {
          console.warn("Error loading clinic user data:", error);
        }

        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
          clinicId: clinicUser?.clinic_id ?? null,
          roleId: clinicUser?.role_id ?? null,
          roleName: clinicUser?.clinic_roles?.name ?? "admin",
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error hydrating user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
          return;
        }

        if (!ignore) {
          console.log(
            "Session data:",
            data.session ? "User logged in" : "No session"
          );
          await hydrateUser(data.session);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLoading(false);
      }
    };

    initAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("Auth state changed:", _event);
        await hydrateUser(session);
      }
    );

    return () => {
      ignore = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) {
        setAuthError("Usuario o contraseña incorrectos");
        return;
      }

      await hydrateUser({ user: data.user });
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Error de autenticación"
      );
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
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, register, loading, authError }}
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
