import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { clearAuthTokens } from "@/lib/auth/token-storage";

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loading, authError } = useAuth();

  // Limpiar tokens expirados al llegar a la página de login
  // para evitar que el interceptor envíe un Bearer vencido en POST /auth/login
  useEffect(() => {
    clearAuthTokens();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Usuario o contraseña incorrectos",
      );
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setError("");
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    authError,
    handleSubmit,
    resetForm,
  };
}
