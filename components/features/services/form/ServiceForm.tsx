"use client";

import { useEffect, useMemo, useRef } from "react";
import { Bot, Info, Stethoscope, Sparkles } from "lucide-react";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/atomic/feedback/alert";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Select } from "@/components/ui/controls/select";
import { AvatarField } from "@/components/ui/controls/avatar-field";
import { useServiceForm } from "@/lib/hooks/services/use-service-form";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import { getClinicCurrencySymbol } from "@/lib/utils/clinic-regional-format";
import {
  SERVICE_ASSISTANT_DESCRIPTION_MAX,
  toSingleLine,
  type ServiceType,
} from "@/lib/entity/services";
import { useI18n } from "@/lib/contexts/i18n-context";

interface ServiceFormProps {
  serviceId?: string;
  basePath?: string;
}

const Req = () => <span className="text-rose-500">*</span>;

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold leading-tight text-ink">
          {title}
        </h3>
        <p className="text-sm text-subtle">{subtitle}</p>
      </div>
    </div>
  );
}

/** Vista previa del símbolo tal como se verá sobre un diente. */
function SymbolPreview({
  mode,
  text,
  image,
  previewLabel,
  previewAlt,
}: {
  mode: string;
  text?: string;
  image?: string;
  previewLabel: string;
  previewAlt: string;
}) {
  const hasImage = mode === "ASSET" && !!image;
  const hasText = mode === "TEXT" && !!text?.trim();
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={previewAlt}
            className="h-10 w-10 object-contain"
          />
        ) : hasText ? (
          <span className="text-lg font-bold leading-none text-ink">
            {text!.trim()}
          </span>
        ) : (
          <Sparkles className="h-5 w-5 text-subtle/50" />
        )}
      </div>
      <span className="text-[0.7rem] text-subtle">{previewLabel}</span>
    </div>
  );
}

export function ServiceForm({
  serviceId,
  basePath = "/settings/services",
}: ServiceFormProps) {
  const { t } = useI18n();
  const { form, isEdit, loading, handleSubmit, handleCancel, assistant } =
    useServiceForm({
      serviceId,
      basePath,
    });
  const { settings, loading: loadingSettings } = useClinicGeneralSettings();
  const currencySymbol = getClinicCurrencySymbol(
    settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency,
  );
  // El costo es un campo que el usuario TECLEA: mostrar el símbolo de respaldo
  // mientras llega la moneda de la clínica le haría escribir la cifra en la
  // moneda equivocada. Hasta entonces se reserva el hueco (el `paddingLeft` de
  // abajo no cambia) pero no se pinta ningún glifo.
  const showCurrencySymbol = !!settings || !loadingSettings;

  const { isDirty } = form.formState;

  const odontogramEnabled = form.watch("odontogramEnabled");
  const symbolMode = form.watch("odontogramSymbolMode");
  const assistantDescription = form.watch("assistantDescription") ?? "";
  // El aviso de "se guardó el servicio pero no lo del asistente" queda al final
  // del formulario, bajo la barra de acciones: se lleva a la vista al aparecer.
  const assistantFailureRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (assistant.failure) {
      assistantFailureRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }
  }, [assistant.failure]);
  const assistantBlockMessage =
    assistant.block === "type"
      ? t("services.assistant.typeNotAllowed")
      : assistant.block === "inactive"
        ? t("services.assistant.inactiveNotAllowed")
        : null;
  const symbolText = form.watch("symbolText");
  const symbolImageValue = form.watch("symbolImage") || form.watch("symbolUrl") || "";
  const typeOptions = useMemo(
    () =>
      [
        ["TREATMENT", t("services.type.TREATMENT")],
        ["PROCEDURE", t("services.type.PROCEDURE")],
        ["PRODUCT", t("services.type.PRODUCT")],
        ["ADVANCE", t("services.type.ADVANCE")],
      ].map(([value, label]) => ({ value: value as ServiceType, label })),
    [t],
  );
  const categoryOptions = useMemo(
    () => [
      { value: "", label: t("services.form.noCategory") },
      { value: "DIAGNOSTICO", label: t("services.category.DIAGNOSTICO") },
      { value: "PREVENTIVO", label: t("services.category.PREVENTIVO") },
      { value: "RESTAURADOR", label: t("services.category.RESTAURADOR") },
      { value: "ENDODONCIA", label: t("services.category.ENDODONCIA") },
      { value: "PERIODONCIA", label: t("services.category.PERIODONCIA") },
      { value: "PROTESIS", label: t("services.category.PROTESIS") },
      { value: "IMPLANTE", label: t("services.category.IMPLANTE") },
      { value: "CIRUGIA", label: t("services.category.CIRUGIA") },
      { value: "ORTODONCIA", label: t("services.category.ORTODONCIA") },
      { value: "ESTETICO", label: t("services.category.ESTETICO") },
      { value: "GENERAL", label: t("services.category.GENERAL") },
    ],
    [t],
  );
  const symbolModeOptions = useMemo(
    () => [
      { value: "NONE", label: t("services.form.symbolModeAuto") },
      { value: "TEXT", label: t("services.form.symbolModeText") },
      { value: "ASSET", label: t("services.form.symbolModeAsset") },
    ],
    [t],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
        noValidate
      >
        {/* Información principal */}
        <section className="bento p-4 lg:p-6">
          <SectionHeader
            icon={<Info className="h-5 w-5" />}
            title={t("services.form.sectionInfo")}
            subtitle={t("services.form.sectionInfoDescription")}
          />

          <div className="grid grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("services.form.code")} <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("services.form.codePlaceholder")}
                      autoComplete="off"
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("services.form.name")} <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("services.form.namePlaceholder")}
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("services.form.type")} <Req />
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={typeOptions}
                      placeholder={t("services.form.typePlaceholder")}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("services.form.cost")} <Req />
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                        {showCurrencySymbol ? currencySymbol : ""}
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        style={{
                          paddingLeft: `calc(1.25rem + ${currencySymbol.length}ch)`,
                        }}
                        disabled={loading}
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
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("services.form.duration")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={5}
                        placeholder={t("services.form.durationPlaceholder")}
                        className="pr-12"
                        disabled={loading}
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
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                        min
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("services.form.category")}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || undefined)}
                      onBlur={field.onBlur}
                      options={categoryOptions}
                      placeholder={t("services.form.categoryPlaceholder")}
                      searchable
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Odontograma */}
        <section className="bento p-4 lg:p-6">
          <SectionHeader
            icon={<Stethoscope className="h-5 w-5" />}
            title={t("services.form.odontogramTitle")}
            subtitle={t("services.form.odontogramDescription")}
          />

          <FormField
            control={form.control}
            name="odontogramEnabled"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-hairline bg-hover/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {t("services.form.visibleInOdontogram")}
                  </p>
                  <p className="text-xs text-subtle">
                    {t("services.form.visibleInOdontogramDescription")}
                  </p>
                </div>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={loading}
                />
              </label>
            )}
          />

          {odontogramEnabled && (
            <div className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="odontogramSymbolMode"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>{t("services.form.symbolMode")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={symbolModeOptions}
                        placeholder={t("services.form.symbolModePlaceholder")}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Panel contextual según el modo elegido */}
              <div className="rounded-xl border border-hairline bg-elevated/30 p-4">
                {symbolMode === "NONE" && (
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <p className="text-sm text-subtle">
                      {t("services.form.autoSymbolDescription")}
                    </p>
                  </div>
                )}

                {symbolMode === "TEXT" && (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <FormField
                      control={form.control}
                      name="symbolText"
                      render={({ field }) => (
                        <FormItem className="w-full sm:max-w-xs">
                          <FormLabel>
                            {t("services.form.symbolText")} <Req />
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("services.form.symbolTextPlaceholder")}
                              maxLength={5}
                              disabled={loading}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <p className="text-xs text-subtle">
                            {t("services.form.symbolTextHint")}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <SymbolPreview
                      mode="TEXT"
                      text={symbolText}
                      previewLabel={t("services.form.symbolPreview")}
                      previewAlt={t("services.form.symbolPreviewAlt")}
                    />
                  </div>
                )}

                {symbolMode === "ASSET" && (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <FormField
                      control={form.control}
                      name="symbolImage"
                      render={({ field }) => {
                        const current =
                          field.value || form.watch("symbolUrl") || "";
                        return (
                          <FormItem className="w-full sm:max-w-xs">
                            <FormLabel>
                              {t("services.form.symbolImage")} <Req />
                            </FormLabel>
                            <AvatarField
                              value={current}
                              onChange={(v) => {
                                field.onChange(v);
                                // Al quitar la imagen, limpiar también la URL
                                // existente para que el borrado sea efectivo.
                                if (!v)
                                  form.setValue("symbolUrl", "", {
                                    shouldDirty: true,
                                  });
                              }}
                              shape="square"
                              size={112}
                              maxSizeMB={2}
                              allowedFormats={[
                                "image/jpeg",
                                "image/png",
                                "image/svg+xml",
                              ]}
                              label={t("services.form.uploadSymbol")}
                              changeLabel={t("services.form.changeSymbol")}
                              alt={t("services.form.symbolAlt")}
                              disabled={loading}
                              className="items-start"
                            />
                            <p className="text-xs text-subtle">
                              {t("services.form.symbolImageHint")}
                            </p>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <SymbolPreview
                      mode="ASSET"
                      image={symbolImageValue}
                      previewLabel={t("services.form.symbolPreview")}
                      previewAlt={t("services.form.symbolPreviewAlt")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Asistente virtual: se guarda con su propio endpoint, después del servicio. */}
        <section className="bento p-4 lg:p-6">
          <SectionHeader
            icon={<Bot className="h-5 w-5" />}
            title={t("services.form.assistantTitle")}
            subtitle={t("services.form.assistantSubtitle")}
          />

          {!assistant.canEdit && (
            <p className="mb-3 text-xs text-subtle">
              {t("services.assistant.noPermission")}
            </p>
          )}

          <FormField
            control={form.control}
            name="assistantVisible"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-hairline bg-hover/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {t("services.table.assistantVisible")}
                  </p>
                  <p className="text-xs text-subtle">
                    {assistantBlockMessage ??
                      t("services.table.assistantVisibleHelp")}
                  </p>
                </div>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={
                    loading || !assistant.canEdit || assistant.block !== null
                  }
                  aria-label={t("services.table.assistantVisible")}
                />
              </label>
            )}
          />

          <FormField
            control={form.control}
            name="assistantDescription"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>{t("services.form.assistantDescription")}</FormLabel>
                <FormControl>
                  {/* Input de una línea (no textarea): el asistente lo dice en un mensaje de chat. */}
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(toSingleLine(e.target.value))}
                    maxLength={SERVICE_ASSISTANT_DESCRIPTION_MAX}
                    placeholder={t("services.form.assistantDescriptionPlaceholder")}
                    disabled={loading || !assistant.canEdit}
                  />
                </FormControl>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-subtle">
                    {t("services.form.assistantDescriptionHelp")}
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-subtle">
                    {assistantDescription.length}/{SERVICE_ASSISTANT_DESCRIPTION_MAX}
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {assistant.failure && (
            <div ref={assistantFailureRef} className="mt-4 scroll-mb-28">
              <Alert variant="destructive">
                <AlertTitle>{t("services.form.assistantSaveFailed")}</AlertTitle>
                <AlertDescription className="space-y-3">
                  {assistant.failure.message && (
                    <span className="block">{assistant.failure.message}</span>
                  )}
                  <span className="flex flex-wrap gap-2">
                    {assistant.canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void assistant.retry()}
                        disabled={assistant.saving}
                      >
                        {t("services.form.assistantRetry")}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                    >
                      {t("services.form.assistantBackToList")}
                    </Button>
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </section>

        {/* Acciones */}
        <FormActionBar
          isDirty={isEdit ? isDirty : undefined}
          onSecondary={handleCancel}
          secondaryLabel={t("services.actions.cancel")}
          submitLabel={
            isEdit
              ? t("services.actions.saveChanges")
              : t("services.actions.save")
          }
          loading={loading}
        />
      </form>
    </Form>
  );
}
