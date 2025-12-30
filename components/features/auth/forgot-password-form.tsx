"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Label } from "@/components/ui/atomic/forms/label";
import { Input } from "@/components/ui/atomic/forms/input";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useDoctorAuth } from "@/lib/hooks/doctors/useDoctorAuth";

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
    <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <CardTitle className="text-3xl font-bold text-gray-900">
          Olvidé mi contraseña
        </CardTitle>
        <CardDescription className="text-gray-600 text-base">
          Ingresa tu correo y te enviaremos instrucciones para restablecerla.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={loading}>
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
      </CardContent>
    </Card>
  );
}
