"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound, Save } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { notify } from "@/lib/utils/notify";
import { useDoctorAuth } from "@/lib/hooks/doctors/useDoctorAuth";
import { requiredText, password } from "@/lib/validation/fields";
import { AuthShell } from "../components/auth-shell";
import { AuthCard } from "../components/auth-card";
import { FloatingField } from "../components/floating-field";
import { PasswordStrength } from "../components/password-strength";

// Compuesto desde lib/validation/fields (unifica política con change-password: 8-64 + mensajes por clase).
const schema = z.object({
  code: requiredText({ min: 1, label: "El código" }),
  password,
});

type ResetPasswordValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { resetPassword, loading } = useDoctorAuth();

  const codeFromUrl = useMemo(() => params.get("code") ?? "", [params]);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { code: codeFromUrl, password: "" },
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
        title="Restablecer contraseña"
        description="Ingresa el código recibido por correo y define tu nueva contraseña."
        icon={<KeyRound className="h-7 w-7" />}
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

          <FloatingField
            id="password"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            disabled={loading}
            error={errors.password?.message}
            {...register("password")}
          />

          <PasswordStrength password={passwordValue} />

          <Button
            type="submit"
            loading={loading}
            className="auth-sheen relative h-12 w-full overflow-hidden bg-brand text-white hover:bg-brand-strong"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
