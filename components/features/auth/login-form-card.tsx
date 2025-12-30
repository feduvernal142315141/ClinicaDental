"use client";

import { Button } from "@/components/ui/primitives/shadcn/button";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/atomic/data-display/card";
import { Loader2 } from "lucide-react";
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
          Bienvenido
        </CardTitle>
        <CardDescription className="text-gray-600 text-base">
          Accede a tu cuenta del sistema médico
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
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
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
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
      </CardContent>
    </Card>
  );
}
