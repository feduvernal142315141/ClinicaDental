"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { notify } from "@/lib/utils/notify";
import { useDoctorAuth } from "@/lib/hooks/doctors/useDoctorAuth";
import { requiredText, password, confirmPasswordRefine } from "@/lib/validation/fields";
import { AuthShell } from "../components/auth-shell";
import { AuthCard } from "../components/auth-card";
import { FloatingField } from "../components/floating-field";
import { PasswordStrength } from "../components/password-strength";

// Compuesto desde lib/validation/fields (unifica política con change-password: 8-64 + mensajes por clase).
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetPassword({ code: values.code, password: values.password });
      router.push("/login");
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : "Error al restablecer contraseña",
        {
          description:
            "No pudimos cambiar tu contraseña. Verifica que el código sea correcto y no haya caducado; vuelve a solicitarlo si es necesario.",
        },
      );
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

          <Button
            type="submit"
            loading={loading}
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
