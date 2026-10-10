export interface DocumentPosition {
  /** Zero-based PDF page and point coordinates from its top-left corner. */
  page: number;
  x: number;
  y: number;
}
export interface DocumentTextStyle {
  start: number; end: number;
  fontFamily?: "Roboto" | "Arial" | "Times New Roman" | "Courier New";
  fontSize?: number;
  bold?: boolean; italic?: boolean; underline?: boolean;
  alignment?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFY";
}
export type SignerRole = "PATIENT" | "SPECIALIST";
export type DocumentBlock = {
  type: "TEXT" | "SIGNATURE" | "LOGO" | "PAGE_BREAK";
  /** PAGE_BREAK: minimum zero-based destination page. */
  page?: number;
  text?: string;
  textStyles?: DocumentTextStyle[];
  alignment?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFY";
  width?: number;
  /** Signature area height in PDF points; defaults to 180. */
  height?: number;
  /** SIGNATURE only; existing blocks default to PATIENT. */
  signerRole?: SignerRole;
  position?: DocumentPosition;
};
export interface DocumentationTemplate {
  id: string;
  name: string;
  version: number;
  blocks: DocumentBlock[];
  sourceId?: string;
  createdAt: string;
}
export interface TemplateInput {
  name: string;
  blocks: DocumentBlock[];
  sourceId?: string;
}
export interface PatientDocument {
  id: string;
  templateId: string;
  templateVersion: number;
  patientId: string;
  patientName: string;
  title: string;
  status: "PENDING" | "SIGNED";
  createdAt: string;
  signedAt?: string;
  method?: "DRAWN" | "CHECKBOX";
  documentHash: string;
  signatureRoles?: SignerRole[];
}
export interface VisitDocumentGroup {
  templateId: string;
  document: PatientDocument;
  signatureRequired: boolean;
  treatments: { eventId: string; serviceId: string; serviceName: string; toothNumber: number; surfaces: string[] }[];
}
export interface VisitDocuments {
  visitId: string;
  patientId: string;
  selectionHash: string;
  eventIds: string[];
  groups: VisitDocumentGroup[];
}
export interface VisitDocumentSelection {
  templateIds?: string[];
  draftOnly?: boolean;
  eventIds: string[];
  expectedSelectionHash: string;
  observations?: Record<string, Record<string, string>>;
}
export interface SignatureInput {
  method: "DRAWN" | "CHECKBOX";
  accepted: true;
  signatureBase64?: string;
  specialistSignatureBase64?: string;
  documentHash: string;
}
export interface ImportedDocument {
  sourceId: string;
  text: string;
  ocrUsed: boolean;
  warnings: string[];
}

export interface DocumentPlacement {
  blockIndex: number;
  type: "TEXT" | "SIGNATURE" | "LOGO";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface TemplateLayout {
  page: number;
  pageCount: number;
  width: number;
  height: number;
  imageDataUrl: string;
  logoDataUrl?: string | null;
  placements: DocumentPlacement[];
}

export interface SignatureRequestStatus {
  status: "NONE" | "SENT" | "LINK_READY" | "EXPIRED" | "SIGNED";
  expiresAt?: string;
  phoneMasked?: string;
}
export interface PublicSigningContext {
  id: string; title: string; patientName: string; documentHash: string; expiresAt: string; signatureRoles: ["PATIENT"];
}
export type PatientSignatureInput = Omit<SignatureInput, "specialistSignatureBase64">;

export interface DocumentationDoctorOption { id: string; name: string }

export interface DocumentSigningPage {
  page: number; pageCount: number; width: number; height: number; imageDataUrl: string; documentHash: string;
  fields: { x: number; top: number; width: number; height: number; signerRole: SignerRole }[];
}
