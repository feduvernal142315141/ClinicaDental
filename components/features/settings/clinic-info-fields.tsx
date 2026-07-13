"use client";

import { useFormContext } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useFormField,
} from "@/components/ui/atomic/forms";
import { Select } from "@/components/ui/controls/select";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { LogoUploader } from "@/components/features/settings/logo-uploader";
import type { GeneralSettingsFormValues } from "@/lib/hooks/settings";
import { CURRENCY_OPTIONS } from "@/lib/entity/settings";

const Req = () => <span className="text-rose-500">*</span>;

/**
 * Máscara ligera del teléfono mientras se escribe: sólo permite dígitos,
 * espacios, guiones, paréntesis y un "+" inicial (código de país). No
 * reformatea el valor existente ni reagrupa dígitos (evita saltos de cursor
 * al editar en medio del texto); sólo descarta caracteres inválidos. Se
 * mantiene deliberadamente laxa (sin patrón rígido por país) porque el form
 * admite clínicas de distintos países vía `TIMEZONE_OPTIONS`.
 */
function maskPhoneInput(raw: string): string {
  const hasLeadingPlus = raw.startsWith("+");
  const rest = raw.slice(hasLeadingPlus ? 1 : 0).replace(/[^\d\s()-]/g, "");
  return (hasLeadingPlus ? "+" : "") + rest;
}

const TIMEZONE_OPTIONS = [
  { value: "America/La_Paz", label: "Bolivia (La Paz)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/New_York", label: "Este (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Los_Angeles", label: "Pacífico (Los Angeles)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

/**
 * Puente entre el `FormItem`/`FormField` de "logoUrl" y `LogoUploader`.
 * `LogoUploader` no es un único control nativo (es un grupo: botón subir +
 * botón quitar + input de archivo oculto), así que en vez de envolverlo en
 * `FormControl` (que sólo puede inyectar id/aria en un único hijo) se lee
 * `formItemId` vía `useFormField` y se cablea manualmente al botón primario
 * ("Subir/Cambiar logo"), que es el control que representa el campo para
 * el `FormLabel` externo (`htmlFor={formItemId}`).
 */
function LogoFieldControl({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  disabled: boolean;
}) {
  const { formItemId } = useFormField();

  return (
    <LogoUploader
      id={formItemId}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

interface ClinicInfoFieldsProps {
  disabled?: boolean;
  subscriptionPlan?: string | null;
}

/**
 * ClinicInfoFields — datos institucionales de la clínica: nombre, teléfono,
 * dirección, logo (Cloudinary vía `LogoUploader`) y configuración regional
 * (moneda / zona horaria). Incluye el plan de suscripción como dato de solo
 * lectura (no es un campo editable del form).
 *
 * Debe renderizarse dentro del `<Form {...form}>` del padre (usa
 * `useFormContext<GeneralSettingsFormValues>`).
 */
export function ClinicInfoFields({
  disabled = false,
  subscriptionPlan,
}: ClinicInfoFieldsProps) {
  const form = useFormContext<GeneralSettingsFormValues>();

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nombre de la clínica <Req />
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Clínica Dental San José"
                  maxLength={120}
                  disabled={disabled}
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
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej: +591 70000000"
                  maxLength={30}
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(maskPhoneInput(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input
                  placeholder="Dirección principal de la clínica"
                  maxLength={255}
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="logoUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Logo de la clínica</FormLabel>
            <LogoFieldControl
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
            />
            <p className="text-xs text-subtle">
              Se muestra en documentos y, próximamente, en el panel lateral de
              la aplicación.
            </p>
          </FormItem>
        )}
      />

      <div className="h-px bg-hairline" />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ink">
          Configuración regional
        </h4>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Moneda <Req />
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={CURRENCY_OPTIONS}
                    placeholder="Seleccione moneda…"
                    searchable
                    searchPlaceholder="Buscar moneda…"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Zona horaria <Req />
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={TIMEZONE_OPTIONS}
                    placeholder="Seleccione zona horaria…"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="text-sm text-subtle">
          Plan actual: <Badge variant="secondary">{subscriptionPlan || "Sin plan"}</Badge>
        </p>
      </div>
    </div>
  );
}
