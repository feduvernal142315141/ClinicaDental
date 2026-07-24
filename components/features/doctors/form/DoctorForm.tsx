"use client";

import { useEffect, useState } from "react";
import { useController } from "react-hook-form";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { CircleAlert, Clock, Coffee, User } from "lucide-react";
import {
  Form,
  FormActionBar,
  FormControl,
  FormDescription,
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
import { AvatarField } from "@/components/ui/controls/avatar-field";
import {
  ClinicRangeHint,
  ClosedState,
  DayOverviewStrip,
  DayToggle,
  ScheduleDayCard,
  ScheduleHeader,
  TimeRangeField,
  type ScheduleDayStatus,
} from "@/components/ui/atomic/schedule";
import { imageUploadService } from "@/lib/services/cloudinary/cloudinary.service";
import { useDoctorForm } from "@/lib/hooks/doctors/use-doctor-form";
import { useRoles } from "@/lib/hooks/roles";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DAYS_OF_WEEK } from "@/lib/entity/schedule";
import {
  formatClinicRange,
  isClinicDayOpen,
} from "@/lib/utils/schedule-bounds";
import { cn } from "@/lib/utils/utils";
import type { Doctor } from "@/lib/entity/doctors";
import type { ClinicScheduleDay } from "@/lib/entity/settings";
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

/** Horario de respaldo cuando la clínica no define horas válidas ese día. */
const FALLBACK_START = "09:00";
const FALLBACK_END = "18:00";

/** Inicial de cada día para el resumen (convención ES: miércoles = X). */
const DAY_SHORT: Record<string, string> = {
  monday: "L",
  tuesday: "M",
  wednesday: "X",
  thursday: "J",
  friday: "V",
  saturday: "S",
  sunday: "D",
};

/**
 * Una fila de día del editor de horarios. El horario del doctor queda
 * acotado por el horario global de la clínica (`clinicDay`, ver contrato de
 * alineación front/back en `lib/utils/schedule-bounds.ts`):
 * - Día cerrado en la clínica → el switch no puede ENCENDERSE (si ya estaba
 *   encendido —doctor legacy—, sí puede apagarse, para no bloquear el
 *   guardado).
 * - Día abierto → se muestra el rango de la clínica como contexto y se
 *   acotan las horas seleccionables del doctor a ese rango.
 * `clinicDay === undefined` (settings aún no cargó) ⇒ no se acota nada;
 * el schema tampoco acota en ese caso (degradación permisiva).
 */
function ScheduleDayRow({
  form,
  dayKey,
  label,
  disabled,
  clinicDay,
  onToggle,
}: {
  form: UseFormReturn<DoctorFormValues>;
  dayKey: keyof DoctorFormValues["schedule"];
  label: string;
  disabled?: boolean;
  clinicDay?: ClinicScheduleDay;
  onToggle: (next: boolean) => void;
}) {
  const { control } = form;

  const enabledField = useController({
    control,
    name: `schedule.${dayKey}.enabled`,
  });
  const startField = useController({
    control,
    name: `schedule.${dayKey}.startTime`,
  });
  const endField = useController({
    control,
    name: `schedule.${dayKey}.endTime`,
  });
  const breakStartField = useController({
    control,
    name: `schedule.${dayKey}.breakStart`,
  });
  const breakEndField = useController({
    control,
    name: `schedule.${dayKey}.breakEnd`,
  });

  const enabled = !!enabledField.field.value;
  const clinicClosed = clinicDay !== undefined && clinicDay.enabled === false;
  const clinicOpen = isClinicDayOpen(clinicDay);
  const clinicRange = formatClinicRange(clinicDay);
  const switchDisabled = disabled || (clinicClosed && !enabled);

  // Estado visual de la tarjeta: "open" manda incluso en el caso legacy
  // (doctor con enabled=true en un día que la clínica cerró después) — ese
  // caso se sigue mostrando como editor abierto + el error de validación
  // bajo el toggle, igual que antes de atomizar.
  const status: ScheduleDayStatus = enabled
    ? "open"
    : clinicClosed
      ? "clinic-closed"
      : "closed";
  const pillStatus = enabled
    ? "active"
    : clinicClosed
      ? "clinic-closed"
      : "closed";

  const minTime = clinicOpen ? (clinicDay!.startTime as string) : undefined;
  const maxTime = clinicOpen ? (clinicDay!.endTime as string) : undefined;

  return (
    <ScheduleDayCard
      status={status}
      toggleSlot={
        <div className="space-y-1">
          <DayToggle
            label={label}
            status={pillStatus}
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={switchDisabled}
          />
          {enabledField.fieldState.error && (
            <p
              aria-live="polite"
              className="text-[0.8rem] leading-tight text-destructive"
            >
              {enabledField.fieldState.error.message}
            </p>
          )}
        </div>
      }
    >
      {enabled ? (
        <div className="space-y-3">
          {/* Dos grupos lado a lado (variante ClinicPro): Horario de Consulta
              y Descanso Intermedio, cada uno con labels flotantes. */}
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <TimeRangeField
              heading="Horario de Consulta"
              startLabel="Desde"
              endLabel="Hasta"
              start={{
                value: startField.field.value,
                onChange: startField.field.onChange,
                onBlur: startField.field.onBlur,
                ariaLabel: `${label}: hora de inicio`,
                ariaInvalid: !!startField.fieldState.error,
                errorMessage: startField.fieldState.error?.message,
              }}
              end={{
                value: endField.field.value,
                onChange: endField.field.onChange,
                onBlur: endField.field.onBlur,
                ariaLabel: `${label}: hora de fin`,
                ariaInvalid: !!endField.fieldState.error,
                errorMessage: endField.fieldState.error?.message,
              }}
              minTime={minTime}
              maxTime={maxTime}
              disabled={disabled}
            />
            <TimeRangeField
              heading="Descanso Intermedio"
              icon={<Coffee className="h-3.5 w-3.5 shrink-0" />}
              startLabel="Inicio"
              endLabel="Fin"
              start={{
                value: breakStartField.field.value,
                onChange: breakStartField.field.onChange,
                onBlur: breakStartField.field.onBlur,
                ariaLabel: `${label}: inicio del descanso`,
                ariaInvalid: !!breakStartField.fieldState.error,
                errorMessage: breakStartField.fieldState.error?.message,
              }}
              end={{
                value: breakEndField.field.value,
                onChange: breakEndField.field.onChange,
                onBlur: breakEndField.field.onBlur,
                ariaLabel: `${label}: fin del descanso`,
                ariaInvalid: !!breakEndField.fieldState.error,
                errorMessage: breakEndField.fieldState.error?.message,
              }}
              disabled={disabled}
            />
          </div>
          {clinicRange && <ClinicRangeHint range={clinicRange} />}
        </div>
      ) : (
        <ClosedState variant={clinicClosed ? "clinic-closed" : "off"} />
      )}
    </ScheduleDayCard>
  );
}

export function DoctorForm({
  doctorId,
  basePath = "/settings/doctors",
  initialData,
  readOnly = false,
  showRoleStatusFields = true,
}: DoctorFormProps) {
  // Único punto de montaje de useClinicGeneralSettings en esta pantalla: se
  // inyecta en useDoctorForm (validación) y se reutiliza aquí para la UI
  // (contexto/límites por día) sin volver a disparar el fetch.
  // `rawSchedule` = horario tal cual lo configuró la clínica (parcial). Se usa
  // en vez de `settings.schedule` (normalizado con defaults para el editor)
  // para no acotar días que la clínica nunca configuró: así el form de doctor
  // queda en paridad con el backend (día ausente ⇒ sin regla).
  const { rawSchedule } = useClinicGeneralSettings();
  const clinicSchedule = rawSchedule ?? null;

  const { form, isEdit, loading, handleSubmit, handleCancel } = useDoctorForm({
    doctorId,
    basePath,
    initialData,
    requireRole: showRoleStatusFields,
    clinicSchedule,
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

  // Resumen + control de días con horario (variante ClinicPro). Abre/cierra un
  // día (misma acción que el switch del tile). Un día que la clínica no abre no
  // puede encenderse; si ya estaba encendido (legacy) sí puede apagarse.
  const scheduleWatch = form.watch("schedule");
  const setDayEnabled = (
    dayKey: keyof DoctorFormValues["schedule"],
    next: boolean,
  ) => {
    const clinicDay = clinicSchedule?.[dayKey];
    if (next && clinicDay?.enabled === false) return;
    // Prellenar las horas ANTES de encender y validar solo en el último
    // setValue (enabled), para no disparar el falso "debe indicar hora...".
    if (next) {
      const clinicOpen = isClinicDayOpen(clinicDay);
      const start = clinicOpen ? (clinicDay!.startTime as string) : FALLBACK_START;
      const end = clinicOpen ? (clinicDay!.endTime as string) : FALLBACK_END;
      form.setValue(`schedule.${dayKey}.startTime`, start, { shouldDirty: true });
      form.setValue(`schedule.${dayKey}.endTime`, end, { shouldDirty: true });
    }
    form.setValue(`schedule.${dayKey}.enabled`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const overviewDays = DAYS_OF_WEEK.map((d) => {
    const active = !!scheduleWatch?.[d.key]?.enabled;
    const clinicClosedForDay = clinicSchedule?.[d.key]?.enabled === false;
    const chipDisabled = formDisabled || (clinicClosedForDay && !active);
    return {
      short: DAY_SHORT[d.key],
      label: d.label,
      active,
      disabled: chipDisabled,
      onToggle: chipDisabled ? undefined : () => setDayEnabled(d.key, !active),
    };
  });

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
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
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
                          <FormDescription className="text-xs leading-snug text-subtle">
                            Define los permisos y accesos del doctor en el
                            sistema.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => {
                        const isActive = !!field.value;
                        return (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <div
                              className={cn(
                                // Compacto: la caja se ajusta al contenido (w-fit) y
                                // el switch va pegado al pill (gap-2.5), en vez de
                                // estirarse a lo ancho con el switch solitario a la
                                // derecha. py-2 mantiene 42px de alto (Switch = 24px).
                                "flex w-fit items-center gap-2.5 rounded-xl border bg-elevated px-3 py-2 transition-colors",
                                isActive
                                  ? "border-emerald-400/25 bg-emerald-500/[0.06]"
                                  : "border-hairline",
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                                  isActive
                                    ? "bg-emerald-500/15 text-emerald-700 ring-emerald-400/25 dark:text-emerald-300"
                                    : "bg-hover text-subtle ring-hairline",
                                )}
                              >
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    isActive ? "bg-emerald-500" : "bg-subtle",
                                  )}
                                />
                                {isActive ? "Activo" : "Inactivo"}
                              </span>
                              <FormControl>
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={field.onChange}
                                  disabled={formDisabled}
                                  className="relative shrink-0 before:absolute before:-inset-3 before:content-['']"
                                />
                              </FormControl>
                            </div>
                            <FormDescription className="text-xs leading-snug text-subtle">
                              {isActive
                                ? "Puede iniciar sesión en el sistema."
                                : "No podrá iniciar sesión en el sistema."}
                            </FormDescription>
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </section>
              )}
            </div>
          </TabsContent>

          {/* ───────────────── Horarios ───────────────── */}
          <TabsContent value="horarios" className="mt-4">
            <section className="bento space-y-4 p-4 sm:p-6">
              <ScheduleHeader
                title="Horarios de atención"
                subtitle="Configura los días y horarios de atención del doctor."
              />
              <DayOverviewStrip days={overviewDays} />
              {/* Mismo grid de 2 columnas que el editor de Opciones Generales. */}
              <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                {DAYS_OF_WEEK.map((day) => (
                  <ScheduleDayRow
                    key={day.key}
                    form={form}
                    dayKey={day.key}
                    label={day.label}
                    disabled={formDisabled}
                    clinicDay={clinicSchedule?.[day.key]}
                    onToggle={(next) => setDayEnabled(day.key, next)}
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
