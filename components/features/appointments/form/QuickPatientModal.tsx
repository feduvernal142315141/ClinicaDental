"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import { Modal as CustomModal } from "@/components/ui/primitives/custom";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
} from "@/components/ui/atomic/forms";
import { Select } from "@/components/ui/controls/select";
import { DateTimePicker } from "@/components/ui/controls/date-time-picker";
import { localTodayInput } from "@/lib/datetime";

const quickPatientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico no válido"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  dateOfBirth: z.string().min(1, "La fecha de nacimiento es obligatoria"),
  gender: z.enum(["M", "F"], { message: "El género es obligatorio" }),
  address: z.string().optional(),
  agreement: z.boolean().optional(),
});

export type QuickPatientFormValues = z.infer<typeof quickPatientSchema>;

const GENDER_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

interface QuickPatientModalProps {
  open: boolean;
  onClose: () => void;
  /** Crea el paciente y devuelve su id (o null si falló). */
  onCreate: (values: QuickPatientFormValues) => Promise<string | null>;
  loading?: boolean;
}

/**
 * Alta rápida de paciente dentro del formulario de cita.
 * Migrado a react-hook-form + zod + controles Bento (sin Ant Design).
 */
export function QuickPatientModal({
  open,
  onClose,
  onCreate,
  loading = false,
}: QuickPatientModalProps) {
  const form = useForm<QuickPatientFormValues>({
    resolver: zodResolver(quickPatientSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: undefined,
      address: "",
      agreement: true,
    },
  });
  const { errors } = form.formState;

  const close = useCallback(() => {
    onClose();
    form.reset();
  }, [onClose, form]);

  const submit = form.handleSubmit(async (values) => {
    const createdId = await onCreate(values);
    if (createdId) close();
  });

  return (
    <CustomModal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      icon={<UserPlus className="h-5 w-5" />}
      title="Registrar nuevo paciente"
      description="Completa los datos para crear y seleccionar el paciente en esta cita."
      className="w-full sm:max-w-2xl"
    >
      <Form {...form}>
        <form onSubmit={submit} noValidate>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pb-5">
            <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre completo <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: María González López"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Correo electrónico <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Ej: maria@email.com"
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Teléfono <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: +505 8275-8275"
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
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fecha de nacimiento <span className="text-rose-500">*</span>
                  </FormLabel>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    showTime={false}
                    max={localTodayInput()}
                    toYear={new Date().getFullYear()}
                    aria-label="Fecha de nacimiento"
                    aria-invalid={!!errors.dateOfBirth}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Género <span className="text-rose-500">*</span>
                  </FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={GENDER_OPTIONS}
                    placeholder="Seleccione género"
                    disabled={loading}
                    aria-label="Género"
                    aria-invalid={!!errors.gender}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Calle Mayor 123, ..."
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="agreement"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-hairline bg-elevated px-4 py-3">
                <div className="space-y-0.5">
                  <FormLabel>Convenio</FormLabel>
                  <p className="text-xs text-subtle">
                    ¿El paciente cuenta con convenio?
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={loading}
                  />
                </FormControl>
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
              Guardar paciente
            </Button>
          </div>
        </form>
      </Form>
    </CustomModal>
  );
}
