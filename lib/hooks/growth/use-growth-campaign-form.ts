"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  growthCampaignFormSchema,
  type GrowthCampaignFormValues,
} from "./growth-campaign-form.schema";
import {
  createGrowthCampaign,
  updateGrowthCampaign,
  getGrowthCampaignById,
} from "@/lib/services/growth/growth-campaigns.service";
import { notify } from "@/lib/utils/notify";
import type { CreateGrowthCampaignRequest, GrowthCampaignType } from "@/lib/entity/growth";

export type { GrowthCampaignFormValues };

interface UseGrowthCampaignFormParams {
  campaignId?: string;
  basePath?: string;
}

export function useGrowthCampaignForm({
  campaignId,
  basePath = "/growth/campaigns",
}: UseGrowthCampaignFormParams) {
  const router = useRouter();
  const isEdit = useMemo(() => !!campaignId, [campaignId]);

  const form = useForm<GrowthCampaignFormValues>({
    resolver: zodResolver(growthCampaignFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      campaignType: "PROMOTION",
      segmentId: "",
      templateId: "",
      scheduledAt: "",
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!isEdit || !campaignId) return;

    getGrowthCampaignById(campaignId)
      .then((campaign) => {
        reset({
          name: campaign.name,
          description: campaign.description ?? "",
          campaignType: campaign.campaignType as GrowthCampaignType,
          segmentId: campaign.segmentId ?? "",
          templateId: campaign.templateId ?? "",
          scheduledAt: campaign.scheduledAt ?? "",
        });
      })
      .catch((err) => {
        notify.error(err?.message || "No se pudo cargar la campaña", {
          description:
            "Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
      });
  }, [isEdit, campaignId, reset]);

  const handleSubmit = useCallback(
    async (values: GrowthCampaignFormValues) => {
      const payload: CreateGrowthCampaignRequest = {
        name: values.name,
        description: values.description,
        campaignType: values.campaignType,
        segmentId: values.segmentId,
        templateId: values.templateId,
        scheduledAt: values.scheduledAt || undefined,
      };

      try {
        if (isEdit && campaignId) {
          await updateGrowthCampaign(campaignId, payload);
          notify.success("Campaña actualizada");
        } else {
          await createGrowthCampaign(payload);
          notify.success("Campaña creada", {
            description:
              "La campaña fue creada en borrador. Puedes enviarla o programarla cuando estés listo.",
          });
        }
        router.push(basePath);
        router.refresh();
      } catch (err: unknown) {
        notify.error(
          err instanceof Error ? err.message : "Error al guardar la campaña",
        );
      }
    },
    [isEdit, campaignId, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  return { form, isEdit, handleSubmit, handleCancel };
}
