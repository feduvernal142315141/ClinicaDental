"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/atomic/forms/label";
import { Input } from "@/components/ui/atomic/forms/input";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useDoctorAuth } from "@/lib/hooks/doctors/useDoctorAuth";
import { AuthFormCard } from "../components/auth-form-card";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { forgotPassword, loading } = useDoctorAuth();
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await forgotPassword({ email });
      router.push("/login");
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Error al solicitar restablecimiento"
      );
    }
  };

  return (
    <AuthFormCard
      title="Olvidé mi contraseña"
      description="Ingresa tu correo y te enviaremos instrucciones para restablecerla."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@clinic.com"
            required
            disabled={loading}
          />
        </div>

        {localError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            {localError}
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {loading ? "Enviando..." : "Enviar instrucciones"}
        </Button>
      </form>

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => router.push("/login")}
      >
        Volver al login
      </Button>
    </AuthFormCard>
  );
}
