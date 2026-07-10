"use client";

import { useEffect, useState } from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { CircleAlert, Clock, User } from "lucide-react";
import {
  Form,
  FormActionBar,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
} from "@/components/ui/atomic/forms";
import TextArea from "@/components/ui/atomic/forms/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives/shadcn/tabs";
import { Select } from "@/components/ui/controls/select";
import { TimeField } from "@/components/ui/controls/time-field";
import { AvatarField } from "@/components/ui/controls/avatar-field";
import { imageUploadService } from "@/lib/services/cloudinary/cloudinary.service";
import { useDoctorForm } from "@/lib/hooks/doctors/use-doctor-form";
import { useRoles } from "@/lib/hooks/roles";
import { DAYS_OF_WEEK } from "@/lib/entity/schedule";
import { cn } from "@/lib/utils/utils";
import type { Doctor } from "@/lib/entity/doctors";
import type { DoctorFormValues } from "@/lib/hooks/doctors/doctor-form.schema";

const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
];

interface DoctorFormProps {
  doctorId?: string;
  basePath?: string;
  initialData?: Doctor;
  readOnly?: boolean;
  /** Mostrar Rol + Estado (default true; ocúltalo en "Mi perfil"). */
  showRoleStatusFields?: boolean;
}

const Req = () => <span className="text-rose-500">*</span>;

/** Una fila de día del editor de horarios. */
function ScheduleDayRow({
  form,
  dayKey,
  label,
  disabled,
}: {
  form: UseFormReturn<DoctorFormValues>;
  dayKey: keyof DoctorFormValues["schedule"];
  label: string;
  disabled?: boolean;
}) {
  const enabled = form.watch(`schedule.${dayKey}.enabled`);

  return (
    <div
      className={cn(
        "rounded-lg border border-hairline p-3 transition-colors",
        enabled ? "bg-surface" : "bg-hover/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <FormField
          control={form.control}
          name={`schedule.${dayKey}.enabled`}
          render={({ field }) => (
            <label className="flex w-32 shrink-0 cursor-pointer items-center gap-2">
              <Switch
                checked={!!field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
              <span className="text-sm font-medium text-ink">{label}</span>
            </label>
          )}
        />

        {enabled ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-subtle">De</span>
            <FormField
              control={form.control}
              name={`schedule.${dayKey}.startTime`}
              render={({ field }) => (
                <TimeField
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  aria-label={`${label}: hora de inicio`}
                  className="w-28"
                />
              )}
            />
            <span className="text-xs text-subtle">a</span>
            <FormField
              control={form.control}
              name={`schedule.${dayKey}.endTime`}
              render={({ field }) => (
                <TimeField
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  aria-label={`${label}: hora de fin`}
                  className="w-28"
                />
              )}
            />
            <span className="ml-2 hidden text-xs text-subtle sm:inline">
              Descanso
            </span>
            <FormField
              control={form.control}
              name={`schedule.${dayKey}.breakStart`}
              render={({ field }) => (
                <TimeField
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  aria-label={`${label}: inicio del descanso`}
                  className="w-28"
                />
              )}
            />
            <span className="text-xs text-subtle">a</span>
            <FormField
              control={form.control}
              name={`schedule.${dayKey}.breakEnd`}
              render={({ field }) => (
                <TimeField
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  aria-label={`${label}: fin del descanso`}
                  className="w-28"
                />
              )}
            />
          </div>
        ) : (
          <span className="text-sm text-subtle">Cerrado</span>
        )}
      </div>
    </div>
  );
}

export function DoctorForm({
  doctorId,
  basePath = "/settings/doctors",
  initialData,
  readOnly = false,
  showRoleStatusFields = true,
}: DoctorFormProps) {
  const { form, isEdit, loading, handleSubmit, handleCancel } = useDoctorForm({
    doctorId,
    basePath,
    initialData,
    requireRole: showRoleStatusFields,
  });
  const { errors, isDirty } = form.formState;
  const { roles, loading: rolesLoading, fetchRoles } = useRoles();
  const [tab, setTab] = useState("datos");

  useEffect(() => {
    fetchRoles({ page: 0, pageSize: 0 });
  }, [fetchRoles]);

  // Al fallar la validación, salta a la primera pestaña con errores (Radix
  // desmonta el contenido inactivo, así que el FormMessage no se vería).
  const onInvalid = (errs: FieldErrors<DoctorFormValues>) => {
    const datos =
      errs.name ||
      errs.email ||
      errs.phone ||
      errs.licenceNumber ||
      errs.specialty ||
      errs.gender ||
      errs.roleId;
    setTab(datos ? "datos" : errs.schedule ? "horarios" : "datos");
  };

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));
  const formDisabled = loading || readOnly;

  const datosError = Boolean(
    errors.name ||
      errors.email ||
      errors.phone ||
      errors.licenceNumber ||
      errors.specialty ||
      errors.gender ||
      errors.roleId,
  );
  const horariosError = Boolean(errors.schedule);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit, onInvalid)}
        className="space-y-6 pb-4"
        noValidate
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="datos" className="gap-1.5">
              <User className="h-4 w-4" /> Datos del doctor
              {datosError && (
                <CircleAlert className="h-3.5 w-3.5 text-rose-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="horarios" className="gap-1.5">
              <Clock className="h-4 w-4" /> Horarios de atención
              {horariosError && (
                <CircleAlert className="h-3.5 w-3.5 text-rose-500" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ───────────────── Datos ───────────────── */}
          <TabsContent
            value="datos"
            className="mt-4 grid gap-6 lg:grid-cols-[200px_1fr]"
          >
            <div className="flex justify-center lg:justify-start lg:pt-2">
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <AvatarField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    disabled={formDisabled}
                    uploader={(file) =>
                      imageUploadService.uploadImage(file, "doctors")
                    }
                  />
                )}
              />
            </div>

            <div className="space-y-6">
              <section className="bento space-y-5 p-6">
                <h3 className="text-sm font-semibold text-ink">
                  Información básica
                </h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Nombre <Req />
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nombre del doctor"
                            disabled={formDisabled}
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
                          Email <Req />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="correo@clinica.com"
                            disabled={formDisabled}
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
                          Teléfono <Req />
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+591 7000 0000"
                            disabled={formDisabled}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="bento space-y-5 p-6">
                <h3 className="text-sm font-semibold text-ink">
                  Información profesional
                </h3>
                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="licenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Número de licencia <Req />
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="LIC-000"
                            disabled={formDisabled}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidad</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Ortodoncia"
                            disabled={formDisabled}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
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
                          Género <Req />
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            options={GENDER_OPTIONS}
                            placeholder="Seleccione género"
                            disabled={formDisabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción / biografía</FormLabel>
                      <FormControl>
                        <TextArea
                          rows={3}
                          placeholder="Información adicional sobre el doctor…"
                          disabled={formDisabled}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              {showRoleStatusFields && (
                <section className="bento space-y-5 p-6">
                  <h3 className="text-sm font-semibold text-ink">Acceso</h3>
                  <div className="grid items-start gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Rol <Req />
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              options={roleOptions}
                              placeholder={
                                rolesLoading
                                  ? "Cargando roles…"
                                  : "Seleccione un rol"
                              }
                              disabled={formDisabled || rolesLoading}
                              searchable
                              searchPlaceholder="Buscar rol…"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border border-hairline bg-elevated px-4 py-3">
                          <div className="space-y-0.5">
                            <FormLabel>Estado</FormLabel>
                            <p className="text-xs text-subtle">
                              {field.value ? "Activo" : "Inactivo"}
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={!!field.value}
                              onCheckedChange={field.onChange}
                              disabled={formDisabled}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </section>
              )}
            </div>
          </TabsContent>

          {/* ───────────────── Horarios ───────────────── */}
          <TabsContent value="horarios" className="mt-4">
            <section className="bento space-y-3 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Horarios de atención
                  </h3>
                  <p className="text-xs text-subtle">
                    Configura los días y horarios de atención del doctor.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => (
                  <ScheduleDayRow
                    key={day.key}
                    form={form}
                    dayKey={day.key}
                    label={day.label}
                    disabled={formDisabled}
                  />
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>

        {!readOnly && (
          <FormActionBar
            isDirty={isEdit ? isDirty : undefined}
            onSecondary={handleCancel}
            submitLabel={isEdit ? "Actualizar" : "Guardar"}
            loading={loading}
          />
        )}
      </form>
    </Form>
  );
}
