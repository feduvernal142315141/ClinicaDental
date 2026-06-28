"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, KeyRound, X } from "lucide-react";
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
import { cn } from "@/lib/utils/utils";

interface ChangePasswordModalProps {
  open: boolean;
  doctorId: string;
  onClose: () => void;
}

// Reglas conservadas exactamente desde SecurityFields (mode="changePassword").
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    password: z
      .string()
      .min(1, "Ingresa tu nueva contraseña")
      .min(8, "Mínimo 8 caracteres")
      .max(50, "Máximo 50 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Debe contener mayúsculas, minúsculas y números"
      ),
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const STRENGTH_REQUIREMENTS: { label: string; test: (pwd: string) => boolean }[] =
  [
    { label: "Al menos 8 caracteres", test: (pwd) => pwd.length >= 8 },
    { label: "Una letra mayúscula", test: (pwd) => /[A-Z]/.test(pwd) },
    { label: "Una letra minúscula", test: (pwd) => /[a-z]/.test(pwd) },
    { label: "Un número", test: (pwd) => /\d/.test(pwd) },
    {
      label: "Un carácter especial",
      test: (pwd) => /[^a-zA-Z0-9]/.test(pwd),
    },
  ];

/**
 * Indicador de fortaleza de contraseña en estilo Bento (sin Ant Design).
 * Reemplaza al antiguo PasswordStrength (acoplado al Form de AntD).
 */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const met = STRENGTH_REQUIREMENTS.filter((req) => req.test(password));
  const strength = (met.length / STRENGTH_REQUIREMENTS.length) * 100;

  let strengthLabel = "Débil";
  let toneText = "text-rose-500";
  let toneBar = "bg-rose-500";
  if (strength >= 40 && strength < 60) {
    strengthLabel = "Media";
    toneText = "text-amber-500";
    toneBar = "bg-amber-500";
  } else if (strength >= 60) {
    strengthLabel = strength >= 80 ? "Excelente" : "Buena";
    toneText = "text-emerald-500";
    toneBar = "bg-emerald-500";
  }

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-hairline bg-elevated p-3">
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-subtle">Fortaleza de contraseña</span>
          <span className={cn("text-xs font-medium", toneText)}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className={cn("h-full rounded-full transition-all", toneBar)}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STRENGTH_REQUIREMENTS.map((req) => {
          const isMet = req.test(password);
          return (
            <div
              key={req.label}
              className={cn(
                "flex items-start gap-2 text-xs transition-colors",
                isMet ? "text-emerald-600" : "text-subtle"
              )}
            >
              {isMet ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
              )}
              <span className="leading-tight">{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
        <form onSubmit={submit}>
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
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <PasswordStrength password={passwordValue} />
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
            <Button type="submit" loading={loading}>
              Cambiar
            </Button>
          </div>
        </form>
      </Form>
    </CustomModal>
  );
}
