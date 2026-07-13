import {QueryPaginationModel} from "@/lib/models/queryPaginationModel";

/**
 * Parámetros de listado de campañas — ruta semántica (Fase 4).
 * El front manda INTENCIÓN plana (q/status/resourceType/sort); el backend
 * (`CampaignSearchMapper`) resuelve columnas/operadores/joins. Reemplaza el
 * dialecto `?filters=field__OP__TYPE_value__AND` que armaba `convertToQueryString`
 * (retirado junto con su único consumidor, `useTable`).
 */
export interface CampaignQueryParams {
    page?: number;
    pageSize?: number;
    /** Búsqueda libre (barre name server-side) */
    q?: string;
    /** Faceta de texto sobre la relación de estado (status.name) */
    status?: string;
    /** Faceta escalar exacta: "image" | "video" */
    resourceType?: string;
    /** Orden semántico: clave lógica + dirección, ej. "name:asc" */
    sort?: string;
}

export interface Campaign {
    id: string;
    name: string;
    effectiveDate: string;
    resource: string;
    resourceUrl: string;
    resourceType: string;
    message: string;
    clinicId: string;
    statusId: string;
    doctor_id: string;
}


export interface RequestCreateCampaign {
    clinicId: string;
    name: string;
    effectiveDate: string;
    fileBase64: string;
    fileName: string;
    message: string;
}

export interface RequestUpdateCampaign {
    id: string;
    name: string;
    effectiveDate: string;
    fileBase64: string;
    fileName: string;
    message: string;
}

export interface ResponseGetAllCampaign {
    id: string;
    name: string;
    effectiveDate: string;
    message: string;
    resourceType: string;
    statusId: string;
    statusName: string;
}

export interface CampaignListResponse {
    entities: ResponseGetAllCampaign[];
    pagination: QueryPaginationModel;
}
