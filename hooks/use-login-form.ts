import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loading, authError } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Usuario o contraseña incorrectos"
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
