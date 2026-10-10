import type { DocumentSigningPage, PatientSignatureInput, PublicSigningContext } from "@/lib/entity/documentation";

export class PublicSigningError extends Error {
  constructor(readonly status: number) { super("Document signing request failed"); }
}
// Deliberately isolated from staff Axios, cookies, refresh and telemetry.
async function request(token: string, action: string, input?: PatientSignatureInput): Promise<Response> {
  const response = await fetch(`/api/document-signing/${action}`, {
    method: input ? "POST" : "GET", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
    headers: { "X-Document-Token": token, ...(input ? { "Content-Type": "application/json" } : {}) },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  if (!response.ok) throw new PublicSigningError(response.status);
  return response;
}
export const publicSigningService = {
  async context(token: string): Promise<PublicSigningContext> { return (await request(token, "context")).json(); },
  async page(token: string, page: number): Promise<DocumentSigningPage> { return (await request(token, `page?page=${page}`)).json(); },
  async preview(token: string, input: PatientSignatureInput): Promise<Blob> { return (await request(token, "preview", input)).blob(); },
  async sign(token: string, input: PatientSignatureInput): Promise<void> { await request(token, "sign", input); },
};
