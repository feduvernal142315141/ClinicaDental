"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { billingService } from "@/lib/services/billing";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import { notify } from "@/lib/utils/notify";
import {
  invoiceFormSchema,
  type InvoiceFormValues,
} from "./invoice-form.schema";
import type { InvoiceResponse } from "@/lib/entity/billing";

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export interface UseInvoiceFormParams {
  patientId: string;
  treatmentPlanId?: string;
  planName?: string;
  planTotalPrice?: number;
}

export function useInvoiceForm({
  patientId,
  treatmentPlanId,
  planName,
  planTotalPrice,
}: UseInvoiceFormParams) {
  const router = useRouter();
  const { settings } = useClinicGeneralSettings();
  const currency =
    settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency;

  const [loading, setLoading] = useState(false);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    mode: "onBlur",
    defaultValues: {
      patientId,
      treatmentPlanId: treatmentPlanId ?? "",
      currency,
      exchangeRate: 1,
      discount: 0,
      dueDate: "",
      notes: planName ? `Factura del plan: ${planName}` : "",
      items:
        planName || planTotalPrice !== undefined
          ? [
              {
                description: planName || "Tratamiento dental",
                quantity: 1,
                unitPrice: planTotalPrice ?? 0,
                discount: 0,
              },
            ]
          : [
              {
                description: "",
                quantity: 1,
                unitPrice: 0,
                discount: 0,
              },
            ],
    },
  });

  const itemsArray = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    form.setValue("currency", currency);
  }, [currency, form]);

  const submit = useCallback(
    async (values: InvoiceFormValues) => {
      setLoading(true);
      try {
        const saved: InvoiceResponse = await billingService.createInvoice({
          patientId: values.patientId,
          estimateId: values.estimateId || undefined,
          treatmentPlanId: values.treatmentPlanId || undefined,
          currency: values.currency,
          exchangeRate: values.exchangeRate ?? 1,
          discount: values.discount ?? 0,
          dueDate: values.dueDate || undefined,
          notes: values.notes?.trim() || undefined,
          items: values.items.map((i) => ({
            serviceId: i.serviceId,
            description: i.description.trim(),
            toothRef: i.toothRef?.trim() || undefined,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount ?? 0,
          })),
        });

        notify.success("Factura emitida", {
          description:
            "La factura quedó registrada. Ya puedes imprimir el recibo o anotar un pago.",
        });
        router.push(
          `/billing/invoices/${saved.id}?patientId=${values.patientId}`,
        );
        return saved;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al emitir la factura"), {
          description: "Revisa los ítems y los montos e inténtalo de nuevo.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const handleCancel = useCallback(() => {
    router.push(`/patients/${patientId}?tab=cuenta`);
  }, [router, patientId]);

  return {
    form,
    itemsArray,
    loading,
    currency,
    submit,
    handleCancel,
  };
}
