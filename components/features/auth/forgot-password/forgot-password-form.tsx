"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useDoctorAuth } from "@/lib/hooks/doctors/useDoctorAuth";
import { resolveClinicSlug } from "@/lib/auth/clinic-slug";
import { AuthShell } from "../components/auth-shell";
import { AuthCard } from "../components/auth-card";
import { FloatingField } from "../components/floating-field";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const router = useRouter();
  const { forgotPassword, loading } = useDoctorAuth();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email);
  const emailError =
    emailTouched && email.length > 0 && !emailValid
      ? "Introduce un email válido (nombre@dominio.com)"
      : emailTouched && email.length === 0
        ? "El email es requerido"
        : null;
  const emailSuccess = emailTouched && emailValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setEmailTouched(true);
    if (!emailValid) {
      return;
    }
    // Se resuelve aquí, dentro del submit: lee `window.location` y hacerlo en render
    // rompería la hidratación. El slug sale del subdominio por el que se entró
    // (diente-sable-360.clinic.dev… → "diente-sable-360").
    const clinicSlug = resolveClinicSlug();
    if (!clinicSlug) {
      // Sin slug el backend responde "El slug de la clínica no puede estar vacío".
      // Mejor decir qué pasa y cómo resolverlo, igual que en el login.
      setLocalError(
        "No pudimos identificar la clínica desde esta dirección. Entra por el enlace de tu clínica.",
      );
      return;
    }
    try {
      await forgotPassword({ email: email.trim(), clinicSlug });
      router.push("/login");
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Error al solicitar restablecimiento",
      );
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Recupera tu acceso"
        description="Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña."
        icon={<Mail className="h-7 w-7" />}
        footer={
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio de sesión
          </Button>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FloatingField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            error={emailError}
            success={emailSuccess}
            disabled={loading}
            required
          />

          {localError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{localError}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            loading={loading}
            className="auth-sheen relative h-12 w-full overflow-hidden bg-brand text-white hover:bg-brand-strong"
          >
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Enviando..." : "Enviar instrucciones"}
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
