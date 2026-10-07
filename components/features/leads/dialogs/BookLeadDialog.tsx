"use client";

import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@/components/ui";
import { MultiSelect } from "@/components/ui/controls/multi-select";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { AvailabilityCalendar } from "@/components/features/appointments/form/AvailabilityCalendar";
import { AvailabilitySlotPicker } from "@/components/features/appointments/form/AvailabilitySlotPicker";
import { useI18n } from "@/lib/contexts/i18n-context";
import { leadDisplayName, type Lead, type LeadPatientMatch } from "@/lib/entity/leads";
import { LEAD_APPOINTMENT_TYPES, LEAD_NOTE_MAX, LEAD_SHORT_TEXT_MAX } from "@/lib/entity/leads/schemas";
import { useLeadProviderOptions, useLeadServiceOptions } from "@/lib/hooks/leads";
import { useLeadBookingForm } from "@/lib/hooks/leads/use-lead-booking-form";
import { LeadConversionSummary } from "./LeadConversionSummary";

const STANDARD_DURATION = "__standard__";
const DURATIONS = [15, 20, 30, 45, 60, 90, 120];

interface BookLeadDialogProps {
  /** `null` cierra el diálogo. */
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
  /** Reservar para un paciente que ya existe (candidato de la coincidencia). */
  existingPatient?: LeadPatientMatch | null;
}

/**
 * Reserva de la primera cita con los mismos selectores de la agenda (calendario de
 * disponibilidad y horas libres). Una sola llamada: el backend crea o enlaza el paciente,
 * crea la cita y convierte el prospecto.
 */
export function BookLeadDialog({ lead, onOpenChange, existingPatient }: BookLeadDialogProps) {
  return (
    <Dialog open={lead !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-bento border-hairline bg-surface sm:max-w-3xl">
        {lead && <BookLeadForm lead={lead} existingPatient={existingPatient ?? null} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BookLeadForm({
  lead,
  existingPatient,
  onClose,
}: {
  lead: Lead;
  existingPatient: LeadPatientMatch | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const providers = useLeadProviderOptions();
  const services = useLeadServiceOptions();
  const {
    form,
    submit,
    submitting,
    result,
    error,
    requireName,
    scheduleReady,
    availableTimes,
    availabilityLoading,
    disabledDate,
    isWorkingDay,
    selectedDayWorked,
  } = useLeadBookingForm({ open: true, lead, existingPatientId: existingPatient?.patientId });

  if (result) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-ink">{result.replayed ? "La cita ya estaba reservada" : "Listo"}</DialogTitle>
          <DialogDescription className="text-subtle">{leadDisplayName(result.lead)}</DialogDescription>
        </DialogHeader>
        <LeadConversionSummary result={result} onNavigate={onClose} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-ink">Reservar primera cita</DialogTitle>
        <DialogDescription className="text-subtle">
          {existingPatient
            ? `La cita se creará para el paciente ${existingPatient.name ?? "existente"} y el prospecto se cerrará como "Ya era paciente".`
            : `Al reservar, «${leadDisplayName(lead)}» pasa a ser paciente de la clínica.`}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {requireName && (
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del paciente</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={LEAD_SHORT_TEXT_MAX} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Quién atiende</FormLabel>
                  <FormControl>
                    <SearchSelect
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={(providers.data ?? []).map((doctor) => ({ value: doctor.id, label: doctor.name }))}
                      placeholder={providers.isPending ? "Cargando…" : "Selecciona"}
                      searchable
                      searchPlaceholder="Buscar…"
                      aria-label="Quién atiende"
                      aria-invalid={!!fieldState.error}
                    />
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
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={LEAD_APPOINTMENT_TYPES.map((value) => ({
                          value,
                          label: t(`clinical.appointmentType.${value}`),
                        }))}
                        aria-label="Tipo de cita"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value || STANDARD_DURATION}
                        onChange={(value) => field.onChange(value === STANDARD_DURATION ? "" : value)}
                        options={[
                          { value: STANDARD_DURATION, label: "Estándar" },
                          ...DURATIONS.map((minutes) => ({ value: String(minutes), label: `${minutes} min` })),
                        ]}
                        aria-label="Duración"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
          </div>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <AvailabilityCalendar
                      value={field.value}
                      onChange={field.onChange}
                      disabledDate={disabledDate}
                      isWorkingDay={isWorkingDay}
                      disabled={submitting}
                      aria-invalid={!!fieldState.error}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Hora</FormLabel>
                  <FormControl>
                    <AvailabilitySlotPicker
                      value={field.value}
                      onChange={field.onChange}
                      availableTimes={availableTimes}
                      loading={availabilityLoading}
                      ready={scheduleReady}
                      disabled={submitting}
                      dayWorked={selectedDayWorked}
                      aria-invalid={!!fieldState.error}
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
                <FormLabel>Servicios (opcional)</FormLabel>
                <FormControl>
                  <MultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={(services.data ?? []).map((service) => ({ value: service.id, label: service.name }))}
                    placeholder="Selecciona servicios"
                    searchPlaceholder="Buscar servicio…"
                    searchable
                    aria-label="Servicios"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas (opcional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} maxLength={LEAD_NOTE_MAX} placeholder="Primera valoración" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                <p>{error.message}</p>
                {error.kind === "agenda" && <p>No se creó nada. Elige otro horario.</p>}
                {error.kind === "already-converted" && (
                  <Link href="/appointments" onClick={onClose} className="font-medium underline">
                    Ir a la agenda
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || error?.kind === "already-converted"}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Reservar cita
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
