"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, Handshake, IdCard, UserPlus } from "lucide-react";
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
import { patientFormSchema, type PatientFormValues } from "@/lib/entity/patients";

/**
 * Reutiliza el schema canónico de paciente (fuente de verdad de validación).
 * Alias conservado por compatibilidad con los consumidores del modal.
 */
export type QuickPatientFormValues = PatientFormValues;

const GENDER_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

/** Encabezado de grupo — jerarquía visual Bento (icono de marca + label discreto). */
function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">
        {title}
      </h3>
    </div>
  );
}

/** Marca de campo obligatorio. */
function RequiredMark() {
  return (
    <span className="text-rose-500" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

interface QuickPatientModalProps {
  open: boolean;
  onClose: () => void;
  /** Crea el paciente y devuelve su id (o null si falló). */
  onCreate: (values: QuickPatientFormValues) => Promise<string | null>;
  loading?: boolean;
}

/**
 * Alta rápida de paciente dentro del formulario de cita.
 *
 * Estándar 2026: react-hook-form + zod (schema canónico `patientFormSchema`),
 * controles Bento (sin Ant Design), campos agrupados por sección con jerarquía
 * visual, toggle "Convenio" como fila estándar y footer con acción primaria a la
 * derecha (ghost/sólido). Crea y selecciona el paciente en la cita.
 */
export function QuickPatientModal({
  open,
  onClose,
  onCreate,
  loading = false,
}: QuickPatientModalProps) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
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
        <form onSubmit={submit} noValidate className="flex flex-col">
          <div className="max-h-[68vh] space-y-6 overflow-y-auto px-6 pb-6">
            {/* Grupo 1 — Datos personales */}
            <section className="space-y-4">
              <SectionHeader
                icon={<IdCard className="h-4 w-4" />}
                title="Datos personales"
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nombre completo
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: María González López"
                        autoComplete="name"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Fecha de nacimiento
                        <RequiredMark />
                      </FormLabel>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        showTime={false}
                        max={localTodayInput()}
                        toYear={new Date().getFullYear()}
                        disabled={loading}
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
                        Género
                        <RequiredMark />
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
              </div>
            </section>

            {/* Grupo 2 — Datos de contacto */}
            <section className="space-y-4">
              <SectionHeader
                icon={<AtSign className="h-4 w-4" />}
                title="Datos de contacto"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
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
                        Teléfono
                        <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="Ej: +505 8275-8275"
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Calle Mayor 123, ..."
                        autoComplete="street-address"
                        disabled={loading}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* Convenio — toggle estándar del proyecto */}
            <FormField
              control={form.control}
              name="agreement"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-hairline bg-elevated px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Handshake className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <FormLabel className="cursor-pointer">Convenio</FormLabel>
                      <p className="text-xs text-subtle">
                        ¿El paciente cuenta con convenio?
                      </p>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      disabled={loading}
                      aria-label="Convenio"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Footer estándar: secundario ghost + primario sólido a la derecha */}
          <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-4">
            <Button
              variant="ghost"
              type="button"
              onClick={close}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              <UserPlus className="h-4 w-4" />
              Registrar paciente
            </Button>
          </div>
        </form>
      </Form>
    </CustomModal>
  );
}
