"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { billingService } from "@/lib/services/billing";
import { treatmentPlanService } from "@/lib/services/odontogram";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import { notify } from "@/lib/utils/notify";
import {
  estimateFormSchema,
  type EstimateFormValues,
} from "./estimate-form.schema";
import type { EstimateResponse } from "@/lib/entity/billing";

function errMsg(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export interface UseEstimateFormParams {
  patientId: string;
  estimateId?: string;
  treatmentPlanId?: string;
  /** Nombre sugerido del plan (para precargar ítem/notas) */
  planName?: string;
  /** Precio sugerido del plan */
  planTotalPrice?: number;
}

export function useEstimateForm({
  patientId,
  estimateId,
  treatmentPlanId,
  planName,
  planTotalPrice,
}: UseEstimateFormParams) {
  const router = useRouter();
  const { settings } = useClinicGeneralSettings();
  const currency =
    settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency;

  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(!!estimateId);
  const [existing, setExisting] = useState<EstimateResponse | null>(null);

  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(estimateFormSchema),
    mode: "onBlur",
    defaultValues: {
      patientId,
      treatmentPlanId: treatmentPlanId ?? "",
      currency,
      exchangeRate: 1,
      discount: 0,
      validUntil: "",
      notes: planName ? `Presupuesto derivado del plan: ${planName}` : "",
      status: "DRAFT",
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

  // Sync currency when settings load
  useEffect(() => {
    if (!estimateId) {
      form.setValue("currency", currency);
    }
  }, [currency, estimateId, form]);

  // Load existing estimate for edit
  useEffect(() => {
    if (!estimateId) return;
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const data = await billingService.getEstimateById(estimateId);
        if (cancelled) return;
        setExisting(data);
        form.reset({
          patientId: data.patientId,
          treatmentPlanId: data.treatmentPlanId ?? "",
          currency: data.currency,
          exchangeRate: data.exchangeRate ?? 1,
          discount: data.discount,
          validUntil: data.validUntil ?? "",
          notes: data.notes ?? "",
          status: data.status === "SENT" ? "SENT" : "DRAFT",
          items: data.items.map((i) => ({
            serviceId: i.serviceId,
            description: i.description,
            toothRef: i.toothRef,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
          })),
        });
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al cargar el presupuesto"), {
          description: "No pudimos abrir el presupuesto para editarlo.",
        });
        router.push(`/patients/${patientId}?tab=cuenta`);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [estimateId, form, patientId, router]);

  // Enrich from treatment plan if we only have an ID
  useEffect(() => {
    if (estimateId || !treatmentPlanId || planName) return;
    let cancelled = false;
    (async () => {
      try {
        const plan = await treatmentPlanService.getTreatmentPlan(treatmentPlanId);
        if (cancelled || !plan) return;
        form.setValue(
          "notes",
          `Presupuesto derivado del plan: ${plan.name}`,
        );
        const currentItems = form.getValues("items");
        const empty =
          currentItems.length === 1 && !currentItems[0]?.description;
        if (empty) {
          form.setValue("items", [
            {
              description: plan.name,
              quantity: 1,
              unitPrice: plan.totalPrice ?? 0,
              discount: 0,
            },
          ]);
        }
      } catch {
        // Silencioso: el form sigue usable sin el plan
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [estimateId, treatmentPlanId, planName, form]);

  const submit = useCallback(
    async (values: EstimateFormValues) => {
      setLoading(true);
      try {
        const payload = {
          patientId: values.patientId,
          treatmentPlanId: values.treatmentPlanId || undefined,
          currency: values.currency,
          exchangeRate: values.exchangeRate ?? 1,
          discount: values.discount ?? 0,
          validUntil: values.validUntil || undefined,
          notes: values.notes?.trim() || undefined,
          status: values.status,
          items: values.items.map((i) => ({
            serviceId: i.serviceId,
            description: i.description.trim(),
            toothRef: i.toothRef?.trim() || undefined,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount ?? 0,
          })),
        };

        let saved: EstimateResponse;
        if (estimateId) {
          saved = await billingService.updateEstimate({
            id: estimateId,
            ...payload,
          });
          notify.success("Presupuesto actualizado", {
            description: "Los cambios se guardaron correctamente.",
          });
        } else {
          saved = await billingService.createEstimate(payload);
          notify.success("Presupuesto creado", {
            description:
              "El presupuesto quedó guardado. Puedes convertirlo en factura cuando el paciente lo acepte.",
          });
        }

        router.push(`/billing/estimates/${saved.id}?patientId=${values.patientId}`);
        return saved;
      } catch (error: unknown) {
        notify.error(errMsg(error, "Error al guardar el presupuesto"), {
          description: "Revisa los ítems y los montos e inténtalo de nuevo.",
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [estimateId, router],
  );

  const handleCancel = useCallback(() => {
    router.push(`/patients/${patientId}?tab=cuenta`);
  }, [router, patientId]);

  return {
    form,
    itemsArray,
    loading,
    loadingDetail,
    existing,
    currency,
    submit,
    handleCancel,
  };
}
