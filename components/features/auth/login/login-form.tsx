"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { useLoginForm } from "@/lib/hooks/use-login-form";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { AuthShell } from "../components/auth-shell";
import { AuthCard } from "../components/auth-card";
import { FloatingField } from "../components/floating-field";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    authError,
    handleSubmit,
  } = useLoginForm();

  const [emailTouched, setEmailTouched] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [remember, setRemember] = useState(true);

  const emailValid = EMAIL_RE.test(email);
  const emailError =
    emailTouched && email.length > 0 && !emailValid
      ? "Introduce un email válido (nombre@dominio.com)"
      : null;
  const emailSuccess = emailTouched && emailValid;

  const detectCaps = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <AuthShell showBrandPanel={false} calm>
      <div className="relative w-full max-w-md">
        {/* Halo de marca animado tras la tarjeta */}
        <div
          aria-hidden
          className="animate-auth-glow pointer-events-none absolute -inset-3 rounded-[2.5rem] bg-gradient-to-r from-brand/30 via-info/25 to-brand-strong/30 blur-2xl"
        />

        <AuthCard
          className="relative z-10 bg-surface/72 auth-glass backdrop-blur-md"
          icon={<Sparkles className="h-7 w-7" />}
          eyebrow="Clinic Flow 360"
          title="Bienvenido de vuelta"
          description="Inicia sesión para continuar"
          footer={
            <p className="flex items-center justify-center gap-1.5 text-xs text-subtle">
              <Lock className="h-3.5 w-3.5 text-brand" />
              Conexión cifrada · verificación en dos pasos
            </p>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="animate-auth-rise [animation-delay:90ms]">
              <FloatingField
                id="email"
                label="Email"
                type="email"
                icon={<Mail />}
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                error={emailError}
                success={emailSuccess}
                disabled={loading}
                required
              />
            </div>

            <div className="animate-auth-rise space-y-1.5 [animation-delay:150ms]">
              <FloatingField
                id="password"
                label="Contraseña"
                type="password"
                icon={<Lock />}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={detectCaps}
                onKeyDown={detectCaps}
                disabled={loading}
                required
              />
              {capsLock ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-500 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Bloq Mayús activado
                </p>
              ) : null}
            </div>

            {/* Recordar sesión · Olvidé contraseña */}
            <div className="animate-auth-rise flex items-center justify-between gap-3 pt-0.5 [animation-delay:210ms]">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-subtle">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-hairline"
                  style={{ accentColor: "rgb(var(--brand))" }}
                />
                Mantener sesión
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-brand transition-colors hover:text-brand-strong"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {authError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-600 animate-in fade-in slide-in-from-top-1 dark:text-rose-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            ) : null}

            <div className="animate-auth-rise [animation-delay:270ms]">
              <Button
                type="submit"
                loading={loading}
                className="auth-sheen group relative h-12 w-full overflow-hidden bg-brand text-white transition-transform hover:bg-brand-strong active:scale-[0.99]"
              >
                {loading ? "Enviando código…" : "Continuar"}
                {!loading ? (
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </Button>
            </div>

            <p className="animate-auth-rise text-center text-xs text-subtle [animation-delay:330ms]">
              Te enviaremos un código de verificación de 6 dígitos a tu correo.
            </p>
          </form>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
