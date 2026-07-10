"use client";

import { Info, Stethoscope, FileText, Sparkles } from "lucide-react";

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
import { Select } from "@/components/ui/controls/select";
import { AvatarField } from "@/components/ui/controls/avatar-field";
import { useServiceForm } from "@/lib/hooks/services/use-service-form";
import {
  SERVICE_TYPE_LABELS,
  SERVICE_CATEGORY_LABELS,
} from "@/lib/entity/services";
import type { ServiceType, ServiceCategory } from "@/lib/entity/services";

interface ServiceFormProps {
  serviceId?: string;
  basePath?: string;
}

const Req = () => <span className="text-rose-500">*</span>;

const TYPE_OPTIONS = (
  Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]
).map(([value, label]) => ({ value, label }));

const CATEGORY_OPTIONS = [
  { value: "", label: "Sin categoría" },
  ...(Object.entries(SERVICE_CATEGORY_LABELS) as [ServiceCategory, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

const SYMBOL_MODE_OPTIONS = [
  { value: "NONE", label: "Automático (por categoría)" },
  { value: "TEXT", label: "Texto personalizado" },
  { value: "ASSET", label: "Imagen personalizada" },
];

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
}: {
  mode: string;
  text?: string;
  image?: string;
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
            alt="Vista previa del símbolo"
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
      <span className="text-[0.7rem] text-subtle">Vista previa</span>
    </div>
  );
}

export function ServiceForm({
  serviceId,
  basePath = "/settings/services",
}: ServiceFormProps) {
  const { form, isEdit, loading, handleSubmit, handleCancel } = useServiceForm({
    serviceId,
    basePath,
  });

  const { isDirty } = form.formState;

  const odontogramEnabled = form.watch("odontogramEnabled");
  const symbolMode = form.watch("odontogramSymbolMode");
  const symbolText = form.watch("symbolText");
  const symbolImageValue = form.watch("symbolImage") || form.watch("symbolUrl") || "";

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
            title="Información del Servicio"
            subtitle="Datos básicos, costo y duración del procedimiento."
          />

          <div className="grid grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Código <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: SRV-001"
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
                    Nombre <Req />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Limpieza dental"
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
                    Tipo de servicio <Req />
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={TYPE_OPTIONS}
                      placeholder="Seleccione tipo…"
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
                    Costo <Req />
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                        $
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
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
                  <FormLabel>Duración</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={5}
                        placeholder="Ej: 30"
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
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || undefined)}
                      onBlur={field.onBlur}
                      options={CATEGORY_OPTIONS}
                      placeholder="Seleccione categoría"
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
            title="Odontograma"
            subtitle="Cómo se representa este servicio en el mapa dental."
          />

          <FormField
            control={form.control}
            name="odontogramEnabled"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-hairline bg-hover/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    Visible en el odontograma
                  </p>
                  <p className="text-xs text-subtle">
                    Permite registrar este servicio sobre los dientes.
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
                    <FormLabel>Modo de símbolo</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={SYMBOL_MODE_OPTIONS}
                        placeholder="Seleccione modo"
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
                      El símbolo se asignará{" "}
                      <span className="font-medium text-ink">automáticamente</span>{" "}
                      según la categoría del servicio. No necesitas configurar nada.
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
                            Texto del símbolo <Req />
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: LD"
                              maxLength={5}
                              disabled={loading}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <p className="text-xs text-subtle">
                            1–5 caracteres que se mostrarán sobre el diente.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <SymbolPreview mode="TEXT" text={symbolText} />
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
                              Imagen del símbolo <Req />
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
                              label="Subir símbolo"
                              changeLabel="Cambiar símbolo"
                              alt="Símbolo del servicio"
                              disabled={loading}
                              className="items-start"
                            />
                            <p className="text-xs text-subtle">
                              PNG, JPG o SVG · máx 2 MB.
                            </p>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <SymbolPreview mode="ASSET" image={symbolImageValue} />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Descripción */}
        <section className="bento p-4 lg:p-6">
          <SectionHeader
            icon={<FileText className="h-5 w-5" />}
            title="Descripción"
            subtitle="Detalles adicionales sobre el procedimiento."
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => {
              const len = (field.value ?? "").length;
              return (
                <FormItem>
                  <FormControl>
                    <TextArea
                      rows={4}
                      maxLength={500}
                      placeholder="Describa brevemente en qué consiste el servicio, indicaciones previas, etc."
                      disabled={loading}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormMessage />
                    <span className="text-xs tabular-nums text-subtle">
                      {len} / 500
                    </span>
                  </div>
                </FormItem>
              );
            }}
          />
        </section>

        {/* Acciones */}
        <FormActionBar
          isDirty={isEdit ? isDirty : undefined}
          onSecondary={handleCancel}
          submitLabel={isEdit ? "Guardar cambios" : "Guardar servicio"}
          loading={loading}
        />
      </form>
    </Form>
  );
}
