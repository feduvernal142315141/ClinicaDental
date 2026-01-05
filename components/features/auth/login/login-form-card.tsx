"use client";

import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";
import { AuthFormCard } from "../components/auth-form-card";
import Link from "next/link";

interface LoginFormCardProps {
  email: string;
  password: string;
  loading: boolean;
  authError: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginFormCard({
  email,
  password,
  loading,
  authError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormCardProps) {
  return (
    <AuthFormCard
      title="Bienvenido"
      description="Accede a tu cuenta del sistema médico"
      contentClassName="space-y-6"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="doctor@clinic.com"
            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-700 font-medium">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="••••••••"
            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {authError && (
          <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            {authError}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          loading={loading}
        >
          Iniciar Sesión
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </AuthFormCard>
  );
}
