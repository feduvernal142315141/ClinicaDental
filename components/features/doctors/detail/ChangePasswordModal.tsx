"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound } from "lucide-react";
import { Modal as CustomModal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/atomic/forms";
import { PasswordInput } from "@/components/ui/atomic/forms/password-input";
import { useDoctorChangePassword } from "@/lib/hooks/doctors";
import { PasswordStrength } from "@/components/features/auth/components/password-strength";
import { PASSWORD_MIN_LENGTH, isPasswordValid } from "@/lib/validation/password-policy";
import {
  password,
  requiredText,
  confirmPasswordRefine,
} from "@/lib/validation/fields";

interface ChangePasswordModalProps {
  open: boolean;
  doctorId: string;
  onClose: () => void;
}

// Compone las primitivas compartidas de lib/validation/fields. La política vive en
// lib/validation/password-policy (la misma regla que valida el backend).
const changePasswordSchema = z
  .object({
    oldPassword: requiredText({ min: 1, label: "La contraseña actual" }),
    password: password,
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .superRefine(confirmPasswordRefine("password", "confirmPassword"));

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordModal({
  open,
  doctorId,
  onClose,
}: ChangePasswordModalProps) {
  const { loading, changeDoctorPassword } = useDoctorChangePassword();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onBlur",
    defaultValues: {
      oldPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = form.watch("password");
  const confirmValue = form.watch("confirmPassword");
  const oldPasswordValue = form.watch("oldPassword");
  // Solo se puede enviar con las cinco reglas cumplidas y las dos contraseñas iguales.
  const canSubmit =
    oldPasswordValue.length > 0 && isPasswordValid(passwordValue) && passwordValue === confirmValue;

  const close = useCallback(() => {
    onClose();
    form.reset();
  }, [onClose, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await changeDoctorPassword({
        doctorId,
        oldPassword: values.oldPassword,
        newPassword: values.password,
      });
      close();
    } catch {
      // Si la petición falla, el hook muestra un toast.
    }
  });

  return (
    <CustomModal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      icon={<KeyRound className="h-5 w-5" />}
      title="Cambiar contraseña"
      description="Ingresa tu contraseña actual y define una nueva contraseña segura."
      className="w-full sm:max-w-md"
    >
      <Form {...form}>
        <form onSubmit={submit} noValidate>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pb-5 pt-1">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contraseña actual <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Contraseña actual"
                      autoComplete="current-password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nueva contraseña <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
                      autoComplete="new-password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <PasswordStrength password={passwordValue} className="mt-2" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Confirmar Contraseña <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Repita la contraseña"
                      autoComplete="new-password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
            <Button
              variant="outline"
              type="button"
              onClick={close}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!canSubmit}>
              Cambiar
            </Button>
          </div>
        </form>
      </Form>
    </CustomModal>
  );
}
