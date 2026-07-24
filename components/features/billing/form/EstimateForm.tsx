"use client";

import { Plus, Trash2, FileText, ListOrdered } from "lucide-react";
import {
  Form,
  FormActionBar,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui/atomic/forms";
import TextArea from "@/components/ui/atomic/forms/textarea";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import { Select } from "@/components/ui/controls/select";
import {
  useEstimateForm,
  type UseEstimateFormParams,
} from "@/lib/hooks/billing/useEstimateForm";
import { getClinicCurrencySymbol } from "@/lib/utils/clinic-regional-format";
import {
  calcDocumentTotal,
  calcSubtotal,
  formatMoney,
} from "@/lib/utils/billing-currency";

type EstimateFormProps = UseEstimateFormParams;

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

export function EstimateForm(props: EstimateFormProps) {
  const {
    form,
    itemsArray,
    loading,
    loadingDetail,
    existing,
    currency,
    submit,
    handleCancel,
  } = useEstimateForm(props);

  const watchedItems = form.watch("items");
  const watchedDiscount = form.watch("discount") ?? 0;
  const subtotal = calcSubtotal(watchedItems ?? []);
  const total = calcDocumentTotal(subtotal, watchedDiscount);
  const symbol = getClinicCurrencySymbol(currency);

  const readOnly =
    existing?.status === "CONVERTED" ||
    existing?.status === "REJECTED" ||
    existing?.status === "EXPIRED";

  if (loadingDetail) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando presupuesto…" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4 pb-24">
        <section className="bento p-4 lg:p-5">
          <SectionHeader
            icon={<FileText className="h-5 w-5" />}
            title="Datos del presupuesto"
            subtitle="Propuesta comercial antes de emitir la factura."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado inicial</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={readOnly || !!props.estimateId}
                      options={[
                        { value: "DRAFT", label: "Borrador" },
                        { value: "SENT", label: "Enviado al paciente" },
                      ]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Válido hasta</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={readOnly}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <TextArea
                      rows={3}
                      disabled={readOnly}
                      placeholder="Condiciones, observaciones…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="bento p-4 lg:p-5">
          <SectionHeader
            icon={<ListOrdered className="h-5 w-5" />}
            title="Ítems"
            subtitle="Servicios o conceptos incluidos en la propuesta."
          />

          <div className="space-y-3">
            {itemsArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-bento border border-hairline bg-canvas/50 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-subtle">
                    Ítem {index + 1}
                  </span>
                  {!readOnly && itemsArray.fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => itemsArray.remove(index)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Quitar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field: f }) => (
                      <FormItem className="sm:col-span-5">
                        <FormLabel>
                          Descripción <Req />
                        </FormLabel>
                        <FormControl>
                          <Input disabled={readOnly} {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.toothRef`}
                    render={({ field: f }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Diente</FormLabel>
                        <FormControl>
                          <Input
                            disabled={readOnly}
                            placeholder="16"
                            {...f}
                            value={f.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field: f }) => (
                      <FormItem className="sm:col-span-1">
                        <FormLabel>Cant.</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            disabled={readOnly}
                            value={f.value ?? ""}
                            onChange={(e) =>
                              f.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                              )
                            }
                            onBlur={f.onBlur}
                            name={f.name}
                            ref={f.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field: f }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Precio</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                              {symbol}
                            </span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="pl-9"
                              disabled={readOnly}
                              value={f.value ?? ""}
                              onChange={(e) =>
                                f.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                                )
                              }
                              onBlur={f.onBlur}
                              name={f.name}
                              ref={f.ref}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.discount`}
                    render={({ field: f }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Desc.</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={readOnly}
                            value={f.value ?? 0}
                            onChange={(e) =>
                              f.onChange(
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            onBlur={f.onBlur}
                            name={f.name}
                            ref={f.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  itemsArray.append({
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    discount: 0,
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Agregar ítem
              </Button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-hairline pt-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descuento global</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={readOnly}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
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
            <div className="rounded-bento border border-hairline bg-canvas/60 p-3 sm:col-span-2">
              <div className="flex items-center justify-between text-sm text-subtle">
                <span>Subtotal</span>
                <span className="tabular-nums text-ink">
                  {formatMoney(subtotal, currency)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-base font-semibold text-ink">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(total, currency)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {!readOnly && (
          <FormActionBar
            isDirty={form.formState.isDirty || !props.estimateId}
            onSecondary={handleCancel}
            loading={loading}
          />
        )}
      </form>
    </Form>
  );
}
