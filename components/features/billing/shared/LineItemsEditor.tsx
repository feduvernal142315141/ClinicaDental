"use client";

import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button, FormControl, FormField, FormItem, FormMessage, Input } from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { emptyLine } from "@/lib/hooks/billing/document-form.schema";
import type { DocumentForm } from "@/lib/hooks/billing/use-document-form";
import { useServiceCatalog } from "@/lib/hooks/billing";
import { calcLineTotal } from "@/lib/utils/billing-currency";
import { NumberInput } from "./NumberInput";
import { Money } from "./Money";

interface LineItemsEditorProps {
  form: DocumentForm;
  currency: string;
  /** Sin permiso `billing_adjust` CREATE se ocultan los descuentos. */
  canDiscount: boolean;
}

const NO_SERVICE = "__none__";

/**
 * Líneas manuales del documento: servicio del catálogo (autocompleta descripción y precio,
 * editables), pieza FDI, cantidad, precio y descuento por línea si hay permiso.
 */
export function LineItemsEditor({ form, currency, canDiscount }: LineItemsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const catalog = useServiceCatalog();
  const serviceOptions = [
    { value: NO_SERVICE, label: "Sin servicio (texto libre)" },
    ...(catalog.data ?? []).map((service) => ({
      value: service.id,
      label: `${service.code} — ${service.name}`,
      searchText: `${service.code} ${service.name}`,
    })),
  ];

  const rootError = form.formState.errors.lines?.root?.message ?? form.formState.errors.lines?.message;

  return (
    <div className="space-y-3">
      {fields.length > 0 && (
        <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,3fr)_5rem_5.5rem_7rem_7rem_7rem_2.5rem] gap-2 px-1 text-xs font-medium uppercase tracking-wider text-subtle lg:grid">
          <span>Servicio</span>
          <span>Descripción</span>
          <span>Pieza</span>
          <span className="text-right">Cant.</span>
          <span className="text-right">Precio</span>
          <span className="text-right">{canDiscount ? "Descuento" : ""}</span>
          <span className="text-right">Total</span>
          <span />
        </div>
      )}

      {fields.map((field, index) => {
        const line = form.watch(`lines.${index}`);
        const total = calcLineTotal(Number(line?.quantity) || 0, Number(line?.unitPrice) || 0, Number(line?.discount) || 0);
        return (
          <div
            key={field.id}
            className="grid grid-cols-2 gap-2 rounded-xl border border-hairline p-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,3fr)_5rem_5.5rem_7rem_7rem_7rem_2.5rem] lg:items-start lg:border-0 lg:p-0"
          >
            <FormField
              control={form.control}
              name={`lines.${index}.serviceId`}
              render={({ field: serviceField }) => (
                <FormItem className="col-span-2 lg:col-span-1">
                  <FormControl>
                    <SearchSelect
                      value={serviceField.value || NO_SERVICE}
                      onChange={(value) => {
                        if (value === NO_SERVICE) {
                          serviceField.onChange(undefined);
                          return;
                        }
                        serviceField.onChange(value);
                        const service = catalog.data?.find((s) => s.id === value);
                        if (service) {
                          form.setValue(`lines.${index}.description`, service.name.slice(0, 200), { shouldValidate: true });
                          form.setValue(`lines.${index}.unitPrice`, service.cost, { shouldValidate: true });
                        }
                      }}
                      options={serviceOptions}
                      searchable
                      searchPlaceholder="Buscar servicio…"
                      placeholder={catalog.isPending ? "Cargando servicios…" : "Servicio"}
                      aria-label={`Servicio de la línea ${index + 1}`}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.description`}
              render={({ field: descriptionField }) => (
                <FormItem className="col-span-2 lg:col-span-1">
                  <FormControl>
                    <Input {...descriptionField} maxLength={200} placeholder="Descripción" aria-label={`Descripción de la línea ${index + 1}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.toothRef`}
              render={({ field: toothField }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...toothField}
                      value={toothField.value ?? ""}
                      maxLength={20}
                      placeholder="Pieza"
                      aria-label={`Pieza FDI de la línea ${index + 1}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.quantity`}
              render={({ field: quantityField }) => (
                <FormItem>
                  <FormControl>
                    <NumberInput
                      {...quantityField}
                      className="text-right"
                      min={0}
                      aria-label={`Cantidad de la línea ${index + 1}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.unitPrice`}
              render={({ field: priceField }) => (
                <FormItem>
                  <FormControl>
                    <NumberInput
                      {...priceField}
                      className="text-right"
                      min={0}
                      aria-label={`Precio de la línea ${index + 1}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canDiscount ? (
              <FormField
                control={form.control}
                name={`lines.${index}.discount`}
                render={({ field: discountField }) => (
                  <FormItem>
                    <FormControl>
                      <NumberInput
                        {...discountField}
                        className="text-right"
                        min={0}
                        aria-label={`Descuento de la línea ${index + 1}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <span className="hidden lg:block" />
            )}
            <div className="flex h-10 items-center justify-end font-medium text-ink">
              <Money amount={total} currency={currency} />
            </div>
            <div className="flex h-10 items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label={`Quitar la línea ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {rootError && <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{rootError}</p>}

      <Button type="button" variant="outline" onClick={() => append(emptyLine())}>
        <Plus className="mr-2 h-4 w-4" />
        Agregar línea
      </Button>
    </div>
  );
}
