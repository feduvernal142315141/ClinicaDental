"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requiredText, optionalText } from "@/lib/validation/fields";
import { IdCard, CalendarCheck2 } from "lucide-react";
import { Modal } from "@/components/ui/primitives/custom";
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
import TextArea from "@/components/ui/atomic/forms/textarea";
import { useCreateUserType, useUpdateUserType } from "@/lib/hooks/userTypes";
import type {
  UserType,
  CreateUserTypeDto,
  UpdateUserTypeDto,
} from "@/lib/entity/userType";

interface UserTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userType?: UserType;
  /**
   * `true` cuando este tipo es el ÚNICO activo con `attendsAppointments=true`
   * de la clínica. Defensa UX: deshabilita apagar el switch (el backend igual
   * rechaza con 409 si se intenta; esto solo evita el viaje al servidor y
   * explica el motivo). No aplica al crear uno nuevo.
   */
  isLastProvider?: boolean;
}

const userTypeSchema = z.object({
  name: requiredText({ min: 1, max: 60, label: "El nombre" }),
  description: optionalText({ max: 255 }),
  attendsAppointments: z.boolean(),
});

type UserTypeFormValues = z.infer<typeof userTypeSchema>;

export function UserTypeFormModal({
  isOpen,
  onClose,
  onSuccess,
  userType,
  isLastProvider = false,
}: UserTypeFormModalProps) {
  const isEdit = !!userType;
  const { createUserType, loading: createLoading } = useCreateUserType();
  const { updateUserType, loading: updateLoading } = useUpdateUserType(userType?.id ?? "");

  const defaultValues = useMemo<UserTypeFormValues>(
    () => ({
      name: userType?.name ?? "",
      description: userType?.description ?? "",
      attendsAppointments: userType?.attendsAppointments ?? false,
    }),
    [userType],
  );

  const form = useForm<UserTypeFormValues>({
    resolver: zodResolver(userTypeSchema),
    mode: "onBlur",
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userType]);

  const attendsAppointments = form.watch("attendsAppointments");
  // Solo bloquea el apagado cuando el toggle YA está encendido y es el último proveedor.
  const disableToggleOff = isEdit && isLastProvider && attendsAppointments;

  const handleSubmit = async (values: UserTypeFormValues) => {
    if (isEdit && userType) {
      const payload: UpdateUserTypeDto = {
        name: values.name,
        description: values.description,
        attendsAppointments: values.attendsAppointments,
      };
      const updated = await updateUserType(payload);
      if (updated) {
        onSuccess();
        onClose();
      }
    } else {
      const payload: CreateUserTypeDto = {
        name: values.name,
        description: values.description,
        attendsAppointments: values.attendsAppointments,
      };
      const created = await createUserType(payload);
      if (created) {
        onSuccess();
        onClose();
      }
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <Modal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      icon={<IdCard className="h-5 w-5" />}
      title={isEdit ? "Editar tipo de usuario" : "Nuevo tipo de usuario"}
      description="Define el nombre, una descripción opcional y si este tipo atiende citas."
      className="w-full sm:max-w-lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pb-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Higienista dental" maxLength={60} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <TextArea
                      rows={2}
                      maxLength={255}
                      placeholder="Descripción breve del cargo o rol"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attendsAppointments"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-canvas px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                        <CalendarCheck2 className="h-4 w-4" />
                      </span>
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium text-ink">
                          Atiende citas
                        </FormLabel>
                        <p className="text-xs text-subtle">
                          Los usuarios de este tipo pueden ser agendados como
                          proveedor de cita.
                        </p>
                        {disableToggleOff && (
                          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                            Es el único tipo activo que atiende citas en la
                            clínica; no puedes desactivarlo aquí.
                          </p>
                        )}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          if (disableToggleOff && !checked) return;
                          field.onChange(checked);
                        }}
                        disabled={disableToggleOff}
                        aria-label="Atiende citas"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar tipo de usuario
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  );
}
