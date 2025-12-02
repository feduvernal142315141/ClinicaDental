import {serviceGet, servicePost, servicePut} from "@/lib/services/baseService";
import {ServiceResponse} from "@/lib/models/response";
import {QueryModel} from "@/lib/models/queryModel";
import {getQueryString} from "@/lib/utils/format";
import {
    Campaign,
    CampaignListResponse,
    RequestCreateCampaign,
    RequestUpdateCampaign
} from "@/lib/entity/campaigns/campaigns";


export const serviceGetCampaignById = async (
    id: string,
): ServiceResponse<Campaign> => {
    return serviceGet<Campaign>(
        `/campaign/${id}`
    )
}

export const serviceGetAllCampaign = async (
    query: QueryModel,
): ServiceResponse<CampaignListResponse> => {
    return serviceGet<CampaignListResponse>(
        `/campaign${
            query ? `?${getQueryString(query)}` : ''
        }`
    )
}

export const serviceGetAllCampaignByClinicId = async (
    clinicId: string,
    query: QueryModel,
): ServiceResponse<CampaignListResponse> => {
    return serviceGet<CampaignListResponse>(
        `/campaign/campaign-by-clinic/${clinicId}${
            query ? `?${getQueryString(query)}` : ''
        }`
    )
}

export const serviceCreateCampaign = async (
    campaign: RequestCreateCampaign): ServiceResponse<string> => {
    return servicePost<RequestCreateCampaign, string>(
        `/campaign`,
        campaign
    )
}

export const serviceUpdateCampaign = async (
    campaign: RequestUpdateCampaign): ServiceResponse<string> => {
    return servicePut<RequestUpdateCampaign, string>(
        `/campaign`,
        campaign
    )
}