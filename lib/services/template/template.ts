import { servicePost } from "@/lib/services/baseService";
import { ServiceResponse } from "@/lib/models/response";
import { RequestCreateTemplate } from "@/lib/entity/template/template";

// Nota (Fase 4): este archivo tenía copias muertas de
// serviceGetCampaignById/serviceGetAllCampaign/serviceGetAllCampaignByClinicId
// (duplicaban lib/services/campaigns/campaigns.ts, apuntaban a /campaign en vez de
// /clinic-template, y sin consumidores reales). Se retiraron; usar los de
// lib/services/campaigns/campaigns.ts si se necesita listar campañas/plantillas.

export const serviceCreateTemplate = async (
  campaign: RequestCreateTemplate,
): ServiceResponse<string> => {
  return servicePost<RequestCreateTemplate, string>(
    `/twilio/create-content-template`,
    campaign,
  );
};
