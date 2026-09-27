"use client";

import { useState, type ComponentType } from "react";
import {
  CalendarClock,
  Clock,
  FileText,
  Plus,
  Save,
  Stethoscope,
  Tag as TagIcon,
  User,
  X,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui/atomic/forms";
import TextArea from "@/components/ui/atomic/forms/textarea";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Select } from "@/components/ui/controls/select";
import { MultiSelect } from "@/components/ui/controls/multi-select";
import { AvailabilityCalendar } from "@/components/features/appointments/form/AvailabilityCalendar";
import { AvailabilitySlotPicker } from "@/components/features/appointments/form/AvailabilitySlotPicker";
import { DoctorScheduleSummary } from "@/components/features/appointments/form/DoctorScheduleSummary";
import { QuickPatientModal } from "@/components/features/appointments/form/QuickPatientModal";
import { LabelSelector, LabelFormModal } from "@/components/app/labels";
import { useAppointmentForm } from "@/lib/hooks/appointments";
import { cn } from "@/lib/utils/utils";
import { useI18n } from "@/lib/contexts/i18n-context";

import type { AppointmentFormPrefill } from "@/lib/hooks/appointments/use-appointment-form";
import type { Appointment } from "@/lib/entity/appointment";
import type { Label } from "@/lib/entity/label";

interface AppointmentFormProps {
  appointmentId?: string;
  basePath?: string;
  initialData?: Appointment;
  prefill?: AppointmentFormPrefill;
  readOnly?: boolean;
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-subtle">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </dt>
      <dd
        className={cn(
          "text-right font-medium text-ink",
          mono && "tabular-nums",
          !value && "font-normal text-subtle/60",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

export function AppointmentForm({
  appointmentId,
  basePath = "/appointments",
  initialData,
  prefill,
  readOnly = false,
}: AppointmentFormProps) {
  const { language, t } = useI18n();
  const [isCreatePatientModalOpen, setIsCreatePatientModalOpen] =
    useState(false);
  const [isCreateLabelModalOpen, setIsCreateLabelModalOpen] = useState(false);

  const {
    form,
    isEdit,
    loading,
    patientCreationLoading,
    catalogsLoading,
    availabilityLoading,
    patientsOptions,
    doctorsOptions,
    servicesOptions,
    availableTimes,
    disabledDate,
    isWorkingDay,
    doctorSchedule,
    clinicSchedule,
    selectedDayWorked,
    getSuggestedDuration,
    getServiceLabel,
    getDoctorLabel,
    handleSubmit,
    handleCancel,
    createQuickPatient,
  } = useAppointmentForm({ appointmentId, basePath, initialData, prefill });

  const { errors } = form.formState;

  // Suscripción puntual a los campos que alimentan resumen / progresividad
  // (evita re-render del formulario completo al teclear motivo/notas).
  const watchedPatientId = form.watch("patientId");
  const watchedDoctorId = form.watch("doctorId");
  const watchedDate = form.watch("date");
  const watchedTime = form.watch("time");
  const watchedDuration = form.watch("duration");
  const watchedType = form.watch("type");
  const watchedServiceIds = form.watch("serviceIds");

  const scheduleReady = Boolean(watchedDoctorId && watchedDate);
  const formDisabled = loading || patientCreationLoading || readOnly;
  const typeOptions = [
    { value: "consultation", label: t("clinical.appointmentType.consultation") },
    { value: "control", label: t("clinical.appointmentType.control") },
    { value: "emergency", label: t("clinical.appointmentType.emergency") },
    { value: "follow_up", label: t("clinical.appointmentType.follow_up") },
    { value: "routine", label: t("clinical.appointmentType.routine") },
  ];

  const patientLabel = patientsOptions.find(
    (o) => o.id === watchedPatientId,
  )?.label;
  const doctorLabel =
    doctorsOptions.find((o) => o.id === watchedDoctorId)?.label ??
    (watchedDoctorId ? getDoctorLabel(watchedDoctorId) : undefined);
  const typeLabel = typeOptions.find((o) => o.value === watchedType)?.label;
  const serviceCount = (watchedServiceIds ?? []).length;
  const dateLabel = watchedDate
    ? new Date(`${watchedDate}T00:00:00`).toLocaleDateString(language, {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null;

  const handleCreateLabelSubmit = (newLabel: Label) => {
    setIsCreateLabelModalOpen(false);
    const current = form.getValues("labelIds") ?? [];
    form.setValue("labelIds", [...current, newLabel.id]);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid gap-6 lg:grid-cols-3"
        noValidate
      >
        {/* ───────────────── Columna formulario ───────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Paciente y doctor */}
          <section className="bento space-y-5 p-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-brand" />
              <h2 className="text-base font-semibold text-ink">
                {t("appointments.form.patientDoctor")}
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>
                      {t("appointments.form.patient")} <span className="text-rose-500">*</span>
                    </FormLabel>
                    <div className="flex min-w-0 items-center gap-2">
                      <FormControl>
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          options={patientsOptions.map((o) => ({
                            value: o.id,
                            label: o.label,
                          }))}
                          placeholder={t("appointments.form.selectPatient")}
                          searchable
                          searchPlaceholder={t("appointments.form.searchPatient")}
                          disabled={formDisabled || catalogsLoading}
                          className="min-w-0 flex-1"
                          aria-label={t("appointments.form.patient")}
                        />
                      </FormControl>
                      {!readOnly && (
                        <button
                          type="button"
                          aria-label={t("appointments.form.registerPatient")}
                          title={t("appointments.form.registerPatient")}
                          disabled={formDisabled || catalogsLoading}
                          onClick={() => setIsCreatePatientModalOpen(true)}
                          className={cn(
                            "grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-hairline bg-elevated text-subtle",
                            "transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand",
                            "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-hairline disabled:hover:bg-elevated disabled:hover:text-subtle",
                          )}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("appointments.form.doctor")} <span className="text-rose-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={(() => {
                          const base = doctorsOptions.map((o) => ({
                            value: o.id,
                            label: o.label,
                          }));
                          const present = new Set(base.map((o) => o.value));
                          // En edición, conserva el doctor ya asignado aunque
                          // hoy esté inactivo (para verlo/reasignarlo); el filtro
                          // de activos lo ocultaría del scheduler.
                          const extra =
                            watchedDoctorId && !present.has(watchedDoctorId)
                              ? [
                                  {
                                    value: watchedDoctorId,
                                    label: `${getDoctorLabel(watchedDoctorId) ?? watchedDoctorId} (no disponible)`,
                                  },
                                ]
                              : [];
                          return [...base, ...extra];
                        })()}
                        placeholder={t("appointments.form.selectDoctor")}
                        searchable
                        searchPlaceholder={t("appointments.form.searchDoctor")}
                        disabled={formDisabled || catalogsLoading}
                        aria-label={t("appointments.form.doctor")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* Fecha y hora */}
          <section className="bento space-y-4 p-6">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand" />
              <h2 className="text-base font-semibold text-ink">{t("appointments.form.dateTime")}</h2>
            </div>

            <DoctorScheduleSummary
              schedule={doctorSchedule}
              ready={Boolean(watchedDoctorId)}
              clinicSchedule={clinicSchedule}
            />

            {!watchedDoctorId ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-hover/40 px-6 py-12 text-center">
                <CalendarClock className="h-8 w-8 text-subtle" />
                <p className="text-sm font-medium text-ink">
                  {t("appointments.form.selectDoctorFirst")}
                </p>
                <p className="text-sm text-subtle">
                  {t("appointments.form.selectDoctorFirstDescription")}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("appointments.form.date")} <span className="text-rose-500">*</span>
                      </FormLabel>
                      <AvailabilityCalendar
                        value={field.value}
                        onChange={field.onChange}
                        disabledDate={disabledDate}
                        isWorkingDay={isWorkingDay}
                        disabled={formDisabled}
                        aria-invalid={!!errors.date}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("appointments.form.time")} <span className="text-rose-500">*</span>
                      </FormLabel>
                      <AvailabilitySlotPicker
                        value={field.value}
                        onChange={field.onChange}
                        availableTimes={availableTimes}
                        loading={availabilityLoading}
                        ready={scheduleReady}
                        dayWorked={selectedDayWorked}
                        disabled={formDisabled}
                        aria-invalid={!!errors.time}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </section>

          {/* Detalles */}
          <section className="bento space-y-5 p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand" />
              <h2 className="text-base font-semibold text-ink">{t("appointments.form.details")}</h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("appointments.form.duration")} <span className="text-rose-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={5}
                          step={5}
                          placeholder="30"
                          className="pr-12"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          disabled={formDisabled}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                          {t("appointments.form.minutes")}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("appointments.form.type")} <span className="text-rose-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={typeOptions}
                        placeholder={t("appointments.form.selectType")}
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
              name="serviceIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("appointments.form.services")}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      value={field.value ?? []}
                      onChange={(ids) => {
                        field.onChange(ids);
                        // Auto-dimensiona la cita con la suma de duraciones de
                        // los servicios; el usuario puede ajustar manualmente.
                        const suggested = getSuggestedDuration(ids);
                        if (suggested) {
                          form.setValue("duration", suggested, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                      onBlur={field.onBlur}
                      options={(() => {
                        const base = servicesOptions.map((o) => ({
                          value: o.id,
                          label: o.label,
                        }));
                        const present = new Set(base.map((o) => o.value));
                        // En edición, conserva servicios ya asignados que el
                        // filtro de tipos/estado ocultaría (para verlos/quitarlos).
                        const extra = (field.value ?? [])
                          .filter((id) => !present.has(id))
                          .map((id) => ({
                            value: id,
                            label: `${getServiceLabel(id) ?? id} (no disponible)`,
                          }));
                        return [...base, ...extra];
                      })()}
                      placeholder={t("appointments.form.selectServices")}
                      searchPlaceholder={t("appointments.form.searchService")}
                      disabled={formDisabled || catalogsLoading}
                    />
                  </FormControl>
                  <p className="text-xs text-subtle">
                    {t("appointments.form.servicesHint")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("appointments.form.reason")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("appointments.form.reasonPlaceholder")}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("appointments.form.notes")}</FormLabel>
                  <FormControl>
                    <TextArea
                      rows={4}
                      placeholder={t("appointments.form.notesPlaceholder")}
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
              name="labelIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("appointments.form.labels")}</FormLabel>
                  <LabelSelector
                    value={field.value ?? []}
                    onChange={field.onChange}
                    disabled={formDisabled}
                    assignedLabels={initialData?.labels}
                    onCreateNew={
                      readOnly ? undefined : () => setIsCreateLabelModalOpen(true)
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
        </div>

        {/* ───────────────── Columna resumen (sticky) ───────────────── */}
        <aside className="lg:col-span-1">
          <div className="bento space-y-4 p-6 lg:sticky lg:top-6">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand" />
              <h2 className="text-base font-semibold text-ink">
                {t("appointments.summary.title")}
              </h2>
            </div>

            {(catalogsLoading || availabilityLoading) && (
              <p className="rounded-lg bg-brand/10 px-3 py-2 text-xs text-brand">
                {t("appointments.summary.loading")}
              </p>
            )}

            <dl className="space-y-3 text-sm">
              <SummaryRow icon={User} label={t("appointments.form.patient")} value={patientLabel} />
              <SummaryRow
                icon={Stethoscope}
                label={t("appointments.form.doctor")}
                value={doctorLabel}
              />
              <SummaryRow
                icon={CalendarClock}
                label={t("appointments.form.date")}
                value={dateLabel}
              />
              <SummaryRow icon={Clock} label={t("appointments.form.time")} value={watchedTime} mono />
              <SummaryRow
                icon={Clock}
                label={t("appointments.form.duration")}
                value={watchedDuration ? `${watchedDuration} ${t("appointments.form.minutes")}` : undefined}
              />
              <SummaryRow icon={FileText} label={t("appointments.form.type")} value={typeLabel} />
              <SummaryRow
                icon={TagIcon}
                label={t("appointments.form.services")}
                value={
                  serviceCount > 0
                    ? `${serviceCount} ${t(serviceCount > 1 ? "appointments.summary.selectedPlural" : "appointments.summary.selectedSingular")}`
                    : undefined
                }
              />
            </dl>

            {!readOnly && (
              <div className="flex flex-col gap-2 border-t border-hairline pt-4">
                <Button
                  type="submit"
                  loading={loading || patientCreationLoading}
                  className="w-full gap-2"
                >
                  <Save aria-hidden="true" className="h-4 w-4" />
                  {isEdit ? t("appointments.action.update") : t("appointments.action.save")}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleCancel}
                  disabled={loading || patientCreationLoading}
                  className="w-full gap-2"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                  {t("appointments.action.cancel")}
                </Button>
              </div>
            )}
          </div>
        </aside>
      </form>

      <QuickPatientModal
        open={isCreatePatientModalOpen}
        onClose={() => setIsCreatePatientModalOpen(false)}
        onCreate={createQuickPatient}
        loading={patientCreationLoading}
      />
      <LabelFormModal
        isOpen={isCreateLabelModalOpen}
        onClose={() => setIsCreateLabelModalOpen(false)}
        onSuccess={handleCreateLabelSubmit}
      />
    </Form>
  );
}
