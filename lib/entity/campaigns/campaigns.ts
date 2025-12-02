import {QueryPaginationModel} from "@/lib/models/queryPaginationModel";

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
