"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
} from "@/components/ui/atomic/forms";
import type { GeneralSettingsFormValues } from "@/lib/hooks/settings";

interface PolicyFieldsProps {
  disabled?: boolean;
}

const Req = () => <span className="text-rose-500">*</span>;

/** Convierte el string de un `<input type="number">` a number|undefined. */
function toNumberOrUndefined(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw);
}

/**
 * PolicyFields — políticas base de citas (anticipación, duración estándar,
 * límite de cancelaciones, reservas online, confirmación, recordatorios).
 *
 * Debe renderizarse dentro del `<Form {...form}>` del padre (usa
 * `useFormContext<GeneralSettingsFormValues>`).
 */
export function PolicyFields({ disabled = false }: PolicyFieldsProps) {
  const form = useFormContext<GeneralSettingsFormValues>();
  const sendReminders = form.watch("sendReminders");

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={form.control}
          name="minimumAdvanceNoticePeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anticipación mínima (minutos)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5}
                  placeholder="Ej: 120"
                  disabled={disabled}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(toNumberOrUndefined(e.target.value))
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="standardAppointmentDuration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Duración estándar (minutos) <Req />
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  step={5}
                  placeholder="Ej: 30"
                  disabled={disabled}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(toNumberOrUndefined(e.target.value))
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cancellationLimitPerMonth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cancelaciones por mes</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="Ej: 3"
                  disabled={disabled}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(toNumberOrUndefined(e.target.value))
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="h-px bg-hairline" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={form.control}
          name="allowOnlineReservations"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-hairline bg-elevated px-4 py-3">
              <div className="space-y-0.5">
                <FormLabel>Reservas en línea</FormLabel>
                <p className="text-xs text-subtle">
                  Define si la clínica acepta reservas online.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requireConfirmation"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-hairline bg-elevated px-4 py-3">
              <div className="space-y-0.5">
                <FormLabel>Requiere confirmación</FormLabel>
                <p className="text-xs text-subtle">
                  Aplica a reservas online futuras.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sendReminders"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-hairline bg-elevated px-4 py-3">
              <div className="space-y-0.5">
                <FormLabel>Enviar recordatorios</FormLabel>
                <p className="text-xs text-subtle">
                  Activa recordatorios automáticos futuros.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {sendReminders && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="reminderTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Recordatorio antes de la cita (minutos) <Req />
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={5}
                    step={5}
                    placeholder="Ej: 1440"
                    disabled={disabled}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(toNumberOrUndefined(e.target.value))
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
