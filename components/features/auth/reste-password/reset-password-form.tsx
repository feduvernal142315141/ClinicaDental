"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, KeyRound, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useDoctorAuth } from "@/lib/hooks/doctors/useDoctorAuth";
import { requiredText, password, confirmPasswordRefine } from "@/lib/validation/fields";
import { AuthShell } from "../components/auth-shell";
import { AuthCard } from "../components/auth-card";
import { FloatingField } from "../components/floating-field";
import { PasswordStrength } from "../components/password-strength";
import { isPasswordValid } from "@/lib/validation/password-policy";

// Compuesto desde lib/validation/fields; la política vive en lib/validation/password-policy
// (las mismas cinco reglas que valida el backend).
const schema = z.object({
  code: requiredText({ min: 1, label: "El código" }),
  password,
  confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
}).superRefine(confirmPasswordRefine("password", "confirmPassword"));

type ResetPasswordValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { resetPassword, loading } = useDoctorAuth();

  const codeFromUrl = useMemo(() => params.get("code") ?? "", [params]);
  const isWelcome = useMemo(() => params.get("welcome") === "1", [params]);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { code: codeFromUrl, password: "", confirmPassword: "" },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = form;

  const passwordValue = watch("password") ?? "";
  const confirmValue = watch("confirmPassword") ?? "";
  // El botón solo se habilita con las cinco reglas cumplidas y las dos contraseñas iguales.
  const canSubmit = isPasswordValid(passwordValue) && passwordValue === confirmValue;

  /** Error del backend: `message` tal cual; `expired` = 404 (enlace vencido o ya usado). */
  const [submitError, setSubmitError] = useState<{ message: string; expired: boolean } | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await resetPassword({ code: values.code, password: values.password });
      router.push("/login");
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      setSubmitError({
        message: err instanceof Error && err.message ? err.message : "No se pudo guardar la contraseña",
        expired: status === 404,
      });
    }
  });

  return (
    <AuthShell>
      <AuthCard
        title={isWelcome ? "Configura tu contraseña" : "Restablecer contraseña"}
        description={
          isWelcome
            ? "Te damos la bienvenida. Crea tu contraseña para acceder a tu cuenta."
            : "Ingresa el código recibido por correo y define tu nueva contraseña."
        }
        icon={
          isWelcome ? (
            <ShieldCheck className="h-7 w-7" />
          ) : (
            <KeyRound className="h-7 w-7" />
          )
        }
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
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {codeFromUrl === "" ? (
            <FloatingField
              id="code"
              label="Código de verificación"
              inputMode="text"
              autoComplete="one-time-code"
              disabled={loading}
              error={errors.code?.message}
              success={!!touchedFields.code && !errors.code}
              {...register("code")}
            />
          ) : (
            <input type="hidden" {...register("code")} />
          )}

          <FloatingField
            id="password"
            label={isWelcome ? "Contraseña" : "Nueva contraseña"}
            type="password"
            autoComplete="new-password"
            disabled={loading}
            error={errors.password?.message}
            {...register("password")}
          />

          <FloatingField
            id="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            disabled={loading}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <PasswordStrength password={passwordValue} />

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p>{submitError.message}</p>
                {submitError.expired && (
                  <p>
                    El enlace venció (dura 15 minutos) o ya se usó.{" "}
                    <Link href="/forgot-password" className="font-medium underline underline-offset-2">
                      Pide uno nuevo en «Olvidé mi contraseña»
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={!canSubmit}
            className="auth-sheen relative h-12 w-full overflow-hidden bg-brand text-white hover:bg-brand-strong"
          >
            <Save className="mr-2 h-4 w-4" />
            {isWelcome
              ? loading
                ? "Creando..."
                : "Crear contraseña"
              : loading
                ? "Guardando..."
                : "Guardar contraseña"}
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
