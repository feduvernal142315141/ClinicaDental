import apiInstance from "@/lib/services/apiConfig";
import type { SignatureRequestStatus, DocumentSigningPage, VisitDocuments, VisitDocumentSelection, DocumentBlock, DocumentationDoctorOption, DocumentationTemplate, ImportedDocument, PatientDocument, SignatureInput, TemplateInput, TemplateLayout } from "@/lib/entity/documentation";

import { patientsService } from "@/lib/services/patients/patients.service";
import { doctorsService } from "@/lib/services/doctors/doctors.service";

const base = "/documentation";
const idPath = (id: string) => encodeURIComponent(id);
const pdfConfig = { responseType: "blob" as const };

type TemplateWire = Omit<DocumentationTemplate, "blocks" | "sourceId"> & {
  sourceId?: string | null;
  blocks: { type: DocumentBlock["type"]; page?: number | null; text?: string | null; textStyles?: DocumentBlock["textStyles"] | null; alignment?: DocumentBlock["alignment"] | null; signerRole?: DocumentBlock["signerRole"] | null; width?: number | null; height?: number | null; position?: DocumentBlock["position"] | null }[];
};
type DocumentWire = Omit<PatientDocument, "signedAt" | "method"> & {
  signedAt?: string | null; method?: PatientDocument["method"] | null;
};
const normalizeTemplate = (value: TemplateWire): DocumentationTemplate => ({
  ...value, sourceId: value.sourceId ?? undefined,
  blocks: value.blocks.map(block => ({
    type: block.type, page: block.page ?? undefined, text: block.text ?? undefined, textStyles: block.textStyles?.map(style => ({ start:style.start,end:style.end,fontFamily:style.fontFamily ?? undefined,fontSize:style.fontSize ?? undefined,bold:style.bold ?? undefined,italic:style.italic ?? undefined,underline:style.underline ?? undefined,alignment:style.alignment ?? undefined })),
    signerRole: block.signerRole ?? undefined, alignment: block.alignment ?? undefined, width: block.width ?? undefined, height: block.height ?? undefined,
    position: block.position ?? undefined,
  })),
});
const normalizeDocument = (value: DocumentWire): PatientDocument => ({
  ...value, signedAt: value.signedAt ?? undefined, method: value.method ?? undefined,
});

// Plain JSON responses. Axios rejects HTTP failures, including conflicts.
export const documentationService = {
  async visitDocuments(visitId: string): Promise<VisitDocuments> {
    const { data } = await apiInstance.get<VisitDocuments>(`${base}/visits/${idPath(visitId)}`);
    return { ...data, groups: data.groups.map(group => ({ ...group, document: normalizeDocument(group.document) })) };
  },
  async prepareVisitDocuments(visitId: string, input: VisitDocumentSelection): Promise<VisitDocuments> {
    const { data } = await apiInstance.post<VisitDocuments>(`${base}/visits/${idPath(visitId)}/selection`, input);
    return { ...data, groups: data.groups.map(group => ({ ...group, document: normalizeDocument(group.document) })) };
  },
  async restartVisitDocument(visitId: string, documentId: string, expectedSelectionHash: string): Promise<VisitDocuments> {
    const { data } = await apiInstance.post<VisitDocuments>(`${base}/visits/${idPath(visitId)}/documents/${idPath(documentId)}/restart`, { expectedSelectionHash });
    return { ...data, groups: data.groups.map(group => ({ ...group, document: normalizeDocument(group.document) })) };
  },
  async patients(search: string): Promise<{ id: string; name: string }[]> {
    const result = await patientsService.getPatients({
      page: 0, pageSize: 10, filters: [`name__CONTAINS_IGNORE_CASE__${search.trim()}`, "active__EQ__true"],
    });
    return result.entities.map(({ id, name }) => ({ id, name }));
  },
  async doctors(search: string): Promise<DocumentationDoctorOption[]> {
    const result = await doctorsService.getDoctors({
      page: 0, pageSize: 10, filters: [`name__CONTAINS_IGNORE_CASE__${search.trim()}`, "active__EQ__true"],
    });
    return result.entities.map(({ id, name }) => ({ id, name }));
  },
  async templates(offset = 0, limit = 25): Promise<DocumentationTemplate[]> {
    return (await apiInstance.get<TemplateWire[]>(`${base}/templates`, { params: { offset, limit } })).data.map(normalizeTemplate);
  },
  async template(id: string): Promise<DocumentationTemplate> {
    return normalizeTemplate((await apiInstance.get<TemplateWire>(`${base}/templates/${idPath(id)}`)).data);
  },
  async importFile(file: File): Promise<ImportedDocument> {
    const data = new FormData();
    data.append("file", file);
    return (await apiInstance.post(`${base}/imports`, data, {
      headers: { "Content-Type": "multipart/form-data" }, timeout: 210_000,
    })).data;
  },
  async save(input: TemplateInput, existing?: { id: string; version: number }): Promise<DocumentationTemplate> {
    if (existing) return normalizeTemplate((await apiInstance.put<TemplateWire>(`${base}/templates/${idPath(existing.id)}`, {
      ...input, expectedVersion: existing.version,
    })).data);
    return normalizeTemplate((await apiInstance.post<TemplateWire>(`${base}/templates`, input)).data);
  },
  async layout(input: TemplateInput, page = 0, signal?: AbortSignal): Promise<TemplateLayout> {
    return (await apiInstance.post<TemplateLayout>(`${base}/templates/layout`, input, { params: { page }, signal })).data;
  },
  async previewTemplate(input: TemplateInput): Promise<Blob> {
    return (await apiInstance.post(`${base}/templates/preview`, input, pdfConfig)).data;
  },
  async documents(offset = 0, limit = 25, patientId?: string): Promise<PatientDocument[]> {
    return (await apiInstance.get<DocumentWire[]>(`${base}/documents`, { params: { offset, limit, patientId } })).data.map(normalizeDocument);
  },
  async prepare(template: DocumentationTemplate, patientId: string, doctorId?: string, documentDate?: string, observations?: Record<string,string>): Promise<PatientDocument> {
    return normalizeDocument((await apiInstance.post<DocumentWire>(`${base}/documents`, {
      templateId: template.id, templateVersion: template.version, patientId, ...(doctorId ? { doctorId } : {}), ...(documentDate ? { documentDate } : {}), ...(observations ? { observations } : {}),
    })).data);
  },
  async document(id: string): Promise<PatientDocument> {
    return normalizeDocument((await apiInstance.get<DocumentWire>(`${base}/documents/${idPath(id)}`)).data);
  },
  async requestSignature(id: string, input: { documentHash: string; specialistSignatureBase64?: string }): Promise<SignatureRequestStatus> {
    return (await apiInstance.post<SignatureRequestStatus>(`${base}/documents/${idPath(id)}/signature-request`, input)).data;
  },
  async signatureRequestStatus(id: string): Promise<SignatureRequestStatus> {
    return (await apiInstance.get<SignatureRequestStatus>(`${base}/documents/${idPath(id)}/signature-request`)).data;
  },
  async signingPage(id: string, page = 0): Promise<DocumentSigningPage> {
    return (await apiInstance.get<DocumentSigningPage>(`${base}/documents/${idPath(id)}/signing-page`, { params: { page } })).data;
  },
  async pdf(id: string): Promise<Blob> {
    return (await apiInstance.get(`${base}/documents/${idPath(id)}/pdf`, pdfConfig)).data;
  },
  async previewSignature(id: string, input: SignatureInput): Promise<Blob> {
    return (await apiInstance.post(`${base}/documents/${idPath(id)}/preview-signature`, input, pdfConfig)).data;
  },
  async sign(id: string, input: SignatureInput): Promise<PatientDocument> {
    return normalizeDocument((await apiInstance.post<DocumentWire>(`${base}/documents/${idPath(id)}/sign`, input)).data);
  },
};
