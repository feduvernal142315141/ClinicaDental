"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Form, Input as AntInput } from "antd";
import { PasswordStrength } from "@/components/features/auth/PasswordStrength";
import { useDoctorAuth } from "@/lib/hooks/doctors/useDoctorAuth";
import { AuthFormCard } from "./auth-form-card";

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8 || pwd.length > 20)
    return "La contraseña debe tener entre 8 y 20 caracteres";
  if (!/[A-Z]/.test(pwd)) return "Debe contener al menos una letra mayúscula";
  if (!/[a-z]/.test(pwd)) return "Debe contener al menos una letra minúscula";
  if (!/\d/.test(pwd)) return "Debe contener al menos un número";
  if (!/[^a-zA-Z0-9]/.test(pwd))
    return "Debe contener al menos un carácter especial";
  return null;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { resetPassword, loading } = useDoctorAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const codeFromUrl = useMemo(() => params.get("code") ?? "", [params]);

  const [form] = Form.useForm();

  const handleSubmit = async (values: { code: string; password: string }) => {
    setLocalError(null);
    const pwdError = validatePassword(values.password);
    if (pwdError) {
      setLocalError(pwdError);
      return;
    }

    try {
      await resetPassword({ code: values.code, password: values.password });
      router.push("/login");
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Error al restablecer contraseña"
      );
    }
  };

  return (
    <AuthFormCard
      title="Restablecer contraseña"
      description="Ingresa el código recibido por correo y tu nueva contraseña."
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ code: codeFromUrl, password: "" }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Código"
          name="code"
          rules={[{ required: true, message: "El código es requerido" }]}
        >
          <AntInput placeholder="Código" disabled={loading} />
        </Form.Item>

        <Form.Item
          label="Nueva contraseña"
          name="password"
          rules={[{ required: true, message: "La contraseña es requerida" }]}
        >
          <AntInput.Password placeholder="••••••••" disabled={loading} />
        </Form.Item>

        <PasswordStrength />

        {localError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 mb-3">
            {localError}
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {loading ? "Guardando..." : "Guardar contraseña"}
        </Button>
      </Form>

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
