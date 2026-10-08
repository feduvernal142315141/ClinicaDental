"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EstimateResponse } from "@/lib/entity/billing";
import { billingErrorMessage, isModuleDisabledError } from "@/lib/services/billing";
import { loadPlanLines } from "./use-billing-catalogs";
import { useCreateEstimate, useUpdateEstimate } from "./use-billing-mutations";
import { useEstimate } from "./use-billing-queries";
import { fromLineItems, toLineInputs, useDocumentForm } from "./use-document-form";

interface UseEstimateEditorOptions {
  /** Edición: id del presupuesto. */
  estimateId?: string;
  /** Alta desde la ficha del paciente o desde un plan. */
  initialPatientId?: string;
  initialPatientName?: string;
  initialPlanId?: string;
}

/** Alta y edición de presupuestos (sección C). */
export function useEstimateEditor({
  estimateId,
  initialPatientId,
  initialPatientName,
  initialPlanId,
}: UseEstimateEditorOptions) {
  const isEdit = !!estimateId;
  const estimateQuery = useEstimate(estimateId);
  const estimate = estimateQuery.data;

  const planLinesQuery = useQuery({
    queryKey: ["billing-catalog", "plan-lines", initialPlanId],
    queryFn: () => loadPlanLines(initialPlanId as string),
    enabled: !isEdit && !!initialPlanId,
  });

  const [patientName, setPatientName] = useState<string | null>(initialPatientName ?? null);

  const document = useDocumentForm({
    kind: "estimate",
    resetKey: isEdit
      ? estimate
        ? `${estimate.id}:${estimate.version}`
        : undefined
      : planLinesQuery.data
        ? `plan:${initialPlanId}`
        : `new:${initialPatientId ?? ""}`,
    defaults: isEdit
      ? estimate
        ? {
            patientId: estimate.patientId,
            treatmentPlanId: estimate.treatmentPlanId ?? undefined,
            lines: fromLineItems(estimate.items),
            discount: estimate.discount,
            currency: estimate.currency,
            exchangeRate: estimate.currency ? estimate.exchangeRate : undefined,
            date: estimate.validUntil ?? undefined,
            notes: estimate.notes ?? "",
          }
        : {}
      : {
          patientId: initialPatientId ?? "",
          treatmentPlanId: initialPlanId,
          ...(planLinesQuery.data && planLinesQuery.data.length > 0 ? { lines: planLinesQuery.data } : {}),
        },
  });

  const create = useCreateEstimate();
  const update = useUpdateEstimate();
  const { form, baseCurrency, permissions } = document;

  /** Guarda y devuelve el presupuesto que devolvió el backend (null si falló). */
  const submit = (status: "DRAFT" | "SENT") =>
    new Promise<EstimateResponse | null>((resolve) => {
      void form.handleSubmit(
        async (values) => {
          form.clearErrors("root");
          const items = toLineInputs(values.lines, permissions.canDiscount);
          const exchangeRate = values.currency !== baseCurrency ? values.exchangeRate : undefined;
          try {
            const saved = isEdit
              ? await update.mutateAsync({
                  id: estimateId as string,
                  data: {
                    items,
                    discount: permissions.canDiscount ? values.discount : undefined,
                    currency: values.currency,
                    exchangeRate,
                    validUntil: values.date || undefined,
                    notes: values.notes?.trim() || undefined,
                  },
                })
              : await create.mutateAsync({
                  patientId: values.patientId,
                  treatmentPlanId: values.treatmentPlanId || undefined,
                  items,
                  discount: permissions.canDiscount && values.discount ? values.discount : undefined,
                  currency: values.currency,
                  exchangeRate,
                  validUntil: values.date || undefined,
                  notes: values.notes?.trim() || undefined,
                  status,
                });
            resolve(saved);
          } catch (error) {
            if (!isModuleDisabledError(error)) {
              form.setError("root", { message: billingErrorMessage(error) });
            }
            resolve(null);
          }
        },
        () => resolve(null),
      )();
    });

  return {
    ...document,
    isEdit,
    estimate,
    estimateQuery,
    planLinesQuery,
    patientName: estimate?.patientName ?? patientName,
    setPatientName,
    submit,
    submitting: create.isPending || update.isPending,
  };
}
