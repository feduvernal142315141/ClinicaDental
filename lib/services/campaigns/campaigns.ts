import {serviceGet, servicePost, servicePut} from "@/lib/services/baseService";
import {ServiceResponse} from "@/lib/models/response";
import {
    Campaign,
    CampaignListResponse,
    CampaignQueryParams,
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

/**
 * Arma el query string semántico (Fase 4): intención plana (q/status/resourceType/sort),
 * el backend (`CampaignSearchMapper`) resuelve columnas/operadores/joins. Réplica del patrón
 * `buildQueryString` de roles/services (URLSearchParams, sin dialecto propio de front).
 */
function buildQueryString(query?: CampaignQueryParams): string {
    if (!query) return '';

    const params = new URLSearchParams();

    if (query.page !== undefined) params.append('page', String(query.page));
    if (query.pageSize !== undefined) params.append('pageSize', String(query.pageSize));
    if (query.q !== undefined && query.q !== '') params.append('q', query.q);
    if (query.status !== undefined && query.status !== '') params.append('status', query.status);
    if (query.resourceType !== undefined && query.resourceType !== '') params.append('resourceType', query.resourceType);
    if (query.sort !== undefined && query.sort !== '') params.append('sort', query.sort);

    return params.toString();
}

export const serviceGetAllCampaign = async (
    query?: CampaignQueryParams,
): ServiceResponse<CampaignListResponse> => {
    const queryString = buildQueryString(query);
    return serviceGet<CampaignListResponse>(
        `/campaign${queryString ? `?${queryString}` : ''}`
    )
}

export const serviceGetAllCampaignByClinicId = async (
    clinicId: string,
    query?: CampaignQueryParams,
): ServiceResponse<CampaignListResponse> => {
    const queryString = buildQueryString(query);
    return serviceGet<CampaignListResponse>(
        `/campaign/campaign-by-clinic/${clinicId}${queryString ? `?${queryString}` : ''}`
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