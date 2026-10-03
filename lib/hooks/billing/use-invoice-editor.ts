"use client";

import { useMemo, useState } from "react";
import { areInvoiceItemsEditable, type InvoiceResponse } from "@/lib/entity/billing";
import { billingErrorMessage, isModuleDisabledError } from "@/lib/services/billing";
import { roundMoney } from "@/lib/utils/billing-currency";
import { useCreateInvoice, useUpdateInvoice } from "./use-billing-mutations";
import { useChargeList, useInvoice } from "./use-billing-queries";
import { fromLineItems, previewTotals, toLineInputs, useDocumentForm } from "./use-document-form";

interface UseInvoiceEditorOptions {
  invoiceId?: string;
  initialPatientId?: string;
  initialPatientName?: string;
  /** Cargos preseleccionados ("Cobrar seleccionados"). */
  initialChargeIds?: string[];
}

/**
 * Alta y edición de recibos (§8.D). Alta: líneas manuales y/o cargos pendientes del paciente
 * (las líneas de cargos no se editan). Edición: notas y vencimiento siempre que no esté anulado;
 * líneas y descuento solo si no tiene pagos ni cargos.
 */
export function useInvoiceEditor({
  invoiceId,
  initialPatientId,
  initialPatientName,
  initialChargeIds = [],
}: UseInvoiceEditorOptions) {
  const isEdit = !!invoiceId;
  const invoiceQuery = useInvoice(invoiceId);
  const invoice = invoiceQuery.data;
  const [patientName, setPatientName] = useState<string | null>(initialPatientName ?? null);

  const document = useDocumentForm({
    kind: "invoice",
    resetKey: isEdit ? (invoice ? `${invoice.id}:${invoice.version}` : undefined) : `new:${initialPatientId ?? ""}`,
    defaults: isEdit
      ? invoice
        ? {
            patientId: invoice.patientId,
            lines: fromLineItems(invoice.items),
            chargeIds: invoice.items.flatMap((item) => (item.chargeId ? [item.chargeId] : [])),
            discount: invoice.discount,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate,
            date: invoice.dueDate ?? undefined,
            notes: invoice.notes ?? "",
          }
        : {}
      : { patientId: initialPatientId ?? "", chargeIds: initialChargeIds },
  });

  const { form, baseCurrency, permissions } = document;
  const patientId = form.watch("patientId");
  const chargeIds = form.watch("chargeIds");

  const chargesQuery = useChargeList(
    { patientId, status: "PENDING", page: 0, pageSize: 100 },
    { enabled: !isEdit && !!patientId },
  );
  const pendingCharges = useMemo(() => chargesQuery.data?.entities ?? [], [chargesQuery.data]);
  const selectedCharges = pendingCharges.filter((charge) => chargeIds.includes(charge.id));
  const chargesSubtotal = roundMoney(selectedCharges.reduce((sum, charge) => sum + charge.total, 0));

  const itemsEditable = !isEdit || (invoice ? areInvoiceItemsEditable(invoice) : false);
  const lines = form.watch("lines");
  const discount = Number(form.watch("discount")) || 0;

  const create = useCreateInvoice();
  const update = useUpdateInvoice();

  const toggleCharge = (id: string, checked: boolean) => {
    const next = checked ? [...chargeIds, id] : chargeIds.filter((current) => current !== id);
    form.setValue("chargeIds", next, { shouldValidate: form.formState.isSubmitted });
    // Los cargos fijan la moneda del recibo (el backend rechaza mezclar monedas).
    const charge = pendingCharges.find((c) => c.id === id);
    if (checked && charge && charge.currency !== form.getValues("currency")) {
      form.setValue("currency", charge.currency);
    }
  };

  const submit = () =>
    new Promise<InvoiceResponse | null>((resolve) => {
      void form.handleSubmit(
        async (values) => {
          form.clearErrors("root");
          try {
            const saved = isEdit
              ? await update.mutateAsync({
                  id: invoiceId as string,
                  data: {
                    ...(itemsEditable
                      ? {
                          items: toLineInputs(values.lines, permissions.canDiscount),
                          discount: permissions.canDiscount ? values.discount : undefined,
                        }
                      : {}),
                    notes: values.notes?.trim() || undefined,
                    dueDate: values.date || undefined,
                  },
                })
              : await create.mutateAsync({
                  patientId: values.patientId,
                  items: values.lines.length ? toLineInputs(values.lines, permissions.canDiscount) : undefined,
                  chargeIds: values.chargeIds.length ? values.chargeIds : undefined,
                  discount: permissions.canDiscount && values.discount ? values.discount : undefined,
                  currency: values.currency,
                  exchangeRate: values.currency !== baseCurrency ? values.exchangeRate : undefined,
                  notes: values.notes?.trim() || undefined,
                  dueDate: values.date || undefined,
                });
            resolve(saved);
          } catch (error) {
            if (!isModuleDisabledError(error)) form.setError("root", { message: billingErrorMessage(error) });
            resolve(null);
          }
        },
        () => resolve(null),
      )();
    });

  return {
    ...document,
    preview: previewTotals(lines, discount, isEdit ? 0 : chargesSubtotal),
    isEdit,
    invoice,
    invoiceQuery,
    itemsEditable,
    patientName: invoice?.patientName ?? patientName,
    setPatientName,
    pendingCharges,
    chargesQuery,
    selectedCharges,
    chargesSubtotal,
    toggleCharge,
    submit,
    submitting: create.isPending || update.isPending,
  };
}
