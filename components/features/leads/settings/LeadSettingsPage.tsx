"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertTitle,
  Button,
  Label,
  Skeleton,
  StatusBadge,
  Switch,
  type StatusBadgeTone,
} from "@/components/ui";
import {
  PUBLIC_BOOKING_STATUS_LABELS,
  PUBLIC_BOOKING_VERSION_CONFLICT_MESSAGE,
  publicBookingStatus,
  type PublicBookingStatus,
} from "@/lib/entity/leads";
import { LEADS_HOME_ROUTE, useLeadPublicBookingForm } from "@/lib/hooks/leads";
import { isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";
import { PublicBookingDoctors } from "./PublicBookingDoctors";
import { PublicBookingRules } from "./PublicBookingRules";
import { PublicBookingServices } from "./PublicBookingServices";

const STATUS_TONE: Record<PublicBookingStatus, StatusBadgeTone> = {
  active: "success",
  pending: "warning",
  disabled: "neutral",
};

/** Configuración de Adquisición de pacientes: reservas en línea desde el sitio web de la clínica. */
export function LeadSettingsPage() {
  const router = useRouter();
  const form = useLeadPublicBookingForm();
  const [leaving, setLeaving] = useState(false);
  const { saved, values, readOnly } = form;
  const status = saved ? publicBookingStatus(saved) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={LEADS_HOME_ROUTE}
          onClick={(event) => {
            if (!form.hasEdits) return;
            event.preventDefault();
            setLeaving(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Adquisición de pacientes
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Reservas en línea</h1>
        <p className="max-w-3xl text-subtle">
          Quien llene el formulario de tu sitio web podrá elegir servicio, doctor y horario, y la cita se crea
          directamente en tu agenda.
        </p>
      </header>

      {form.loading && (
        <div className="space-y-4" role="status" aria-label="Cargando la configuración">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {form.loadError && !isLeadModuleDisabledError(form.loadError) && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar la configuración</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{leadErrorMessage(form.loadError)}</span>
            <Button variant="outline" size="sm" onClick={form.retryLoad}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {saved && status && (
        <form onSubmit={form.submit} noValidate className="space-y-4">
          {readOnly && (
            <Alert variant="info" live={false}>
              <AlertDescription>
                Solo lectura: no tienes permiso para cambiar esta configuración.
              </AlertDescription>
            </Alert>
          )}

          <section className="bento flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-3">
              <Switch
                id="booking-enabled"
                checked={values.enabled}
                onCheckedChange={(enabled) => form.change({ ...values, enabled })}
                disabled={readOnly}
              />
              <Label htmlFor="booking-enabled" className="text-base font-medium text-ink">
                Permitir que los prospectos agenden desde el sitio web
              </Label>
            </div>
            <StatusBadge tone={STATUS_TONE[status]} className="max-w-full whitespace-normal text-left" data-status={status}>
              {PUBLIC_BOOKING_STATUS_LABELS[status]}
            </StatusBadge>
          </section>

          <PublicBookingDoctors form={form} />
          <PublicBookingServices form={form} />
          <PublicBookingRules form={form} />

          {form.conflict && (
            <Alert variant="warning">
              <AlertTitle>{PUBLIC_BOOKING_VERSION_CONFLICT_MESSAGE}</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>Recarga para ver la versión actual. Los cambios que no guardaste se perderán.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void form.reload()} disabled={form.reloading}>
                  {form.reloading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Recargar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {form.serverError && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo guardar</AlertTitle>
              <AlertDescription>{form.serverError}</AlertDescription>
            </Alert>
          )}

          {!readOnly && form.problems.general.length > 0 && (
            <Alert variant="warning">
              <AlertDescription>
                {form.problems.general.map((problem) => (
                  <span key={problem} className="block">
                    {problem}
                  </span>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {!readOnly && (
            <footer className="bento sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 p-3">
              {form.hasUnavailable && !form.hasEdits && (
                <p className="mr-auto text-sm text-subtle">Al guardar se quita lo que ya no está disponible.</p>
              )}
              <Button type="button" variant="outline" onClick={form.discard} disabled={!form.hasEdits || form.saving}>
                Descartar
              </Button>
              <Button type="submit" disabled={!form.canSave}>
                {form.saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Guardar cambios
              </Button>
            </footer>
          )}
        </form>
      )}

      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>Si sales ahora, los cambios de las reservas en línea se pierden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(LEADS_HOME_ROUTE)}>Salir sin guardar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
