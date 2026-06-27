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
          <Label htmlFor="email" className="text-ink font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="doctor@clinic.com"
            className="h-12 border-hairline focus:border-brand focus:ring-brand"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-ink font-medium">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="••••••••"
            className="h-12 border-hairline focus:border-brand focus:ring-brand"
            required
          />
        </div>

        {authError && (
          <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-500/15 p-4 rounded-lg border border-rose-400/25">
            {authError}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-brand hover:bg-brand-strong"
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
