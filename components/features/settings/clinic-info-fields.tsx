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
import { useI18n } from "@/lib/contexts/i18n-context";
import type { GeneralSettingsFormValues } from "@/lib/hooks/settings";
import {
  CURRENCY_SELECT_OPTIONS,
  LANGUAGE_SELECT_OPTIONS,
  TIMEZONE_SELECT_OPTIONS,
} from "@/components/features/settings/regional-select-options";

export const Req = () => <span className="text-rose-500">*</span>;

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
 * (moneda / zona horaria / idioma). Incluye el plan de suscripción como dato
 * de solo lectura (no es un campo editable del form).
 *
 * Debe renderizarse dentro del `<Form {...form}>` del padre (usa
 * `useFormContext<GeneralSettingsFormValues>`).
 */
export function ClinicInfoFields({
  disabled = false,
  subscriptionPlan,
}: ClinicInfoFieldsProps) {
  const form = useFormContext<GeneralSettingsFormValues>();
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("settings.general.clinicName")} <Req />
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t("settings.general.clinicNamePlaceholder")}
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
              <FormLabel>{t("settings.general.phone")}</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t("settings.general.phonePlaceholder")}
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
              <FormLabel>{t("settings.general.address")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("settings.general.addressPlaceholder")}
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
            <FormLabel>{t("settings.general.logo")}</FormLabel>
            <LogoFieldControl
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
            />
            <p className="text-xs text-subtle">
              {t("settings.general.logoDescription")}
            </p>
          </FormItem>
        )}
      />

      <div className="h-px bg-hairline" />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ink">
          {t("settings.general.regionalConfig")}
        </h4>
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("settings.general.currency")} <Req />
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={CURRENCY_SELECT_OPTIONS}
                    placeholder={t("settings.general.currencyPlaceholder")}
                    searchable
                    searchPlaceholder={t("settings.general.currencySearch")}
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
                  {t("settings.general.timezone")} <Req />
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={TIMEZONE_SELECT_OPTIONS}
                    placeholder={t("settings.general.timezonePlaceholder")}
                    searchable
                    searchPlaceholder={t("settings.general.timezoneSearch")}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("settings.general.language")} <Req />
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={LANGUAGE_SELECT_OPTIONS}
                    placeholder={t("settings.general.languagePlaceholder")}
                    searchable
                    searchPlaceholder={t("settings.general.languageSearch")}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="text-sm text-subtle">
          {t("settings.general.currentPlan")}:{" "}
          <Badge variant="secondary">
            {subscriptionPlan || t("settings.general.noPlan")}
          </Badge>
        </p>
      </div>
    </div>
  );
}
