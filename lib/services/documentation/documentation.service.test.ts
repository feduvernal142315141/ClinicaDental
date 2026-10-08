import { beforeEach, describe, expect, it, vi } from "vitest";
import apiInstance from "@/lib/services/apiConfig";
import { documentationService as service } from "./documentation.service";
import { templateSchema } from "@/lib/validation/documentation";
import type { DocumentationTemplate, SignatureInput } from "@/lib/entity/documentation";

vi.mock("@/lib/services/apiConfig", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const wireTemplate = {
  id: "template-a", name: "Consentimiento", version: 3, createdAt: "2026-10-02T10:00:00Z", sourceId: null,
  blocks: [
    { type: "TEXT", text: "Contenido revisado", alignment: null, width: null },
    { type: "SIGNATURE", text: null, alignment: "LEFT", width: 260 },
  ],
};
const wireDocument = {
  id: "document-a", templateId: "template-a", templateVersion: 3, patientId: "patient-a", patientName: "Paciente de prueba",
  title: "Consentimiento", status: "PENDING", createdAt: "2026-10-02T10:00:00Z", signedAt: null, method: null, documentHash: "snapshot-hash",
};
beforeEach(() => vi.resetAllMocks());

describe("documentation transport contract", () => {
  it("sends the selected date as an ISO calendar date when preparing", async () => {
    vi.mocked(apiInstance.post).mockResolvedValue({ data: wireDocument });
    await service.prepare({ id: "template-a", version: 3 } as DocumentationTemplate,"patient-a",undefined,"2026-09-15");
    expect(apiInstance.post).toHaveBeenCalledWith("/documentation/documents", { templateId: "template-a", templateVersion: 3, patientId: "patient-a", documentDate: "2026-09-15" });
  });
  it("searches patients through the existing structured filter contract and maps identities only", async () => {
    vi.mocked(apiInstance.get).mockResolvedValue({ status: 200, data: { entities: [{ id: "patient-a", name: "Paciente ficticio", email: "synthetic@example.test" }], pagination: {} } });
    expect(await service.patients(" hel ")).toEqual([{ id: "patient-a", name: "Paciente ficticio" }]);
    expect(apiInstance.get).toHaveBeenCalledWith("/patients?page=0&pageSize=10&filters=name__CONTAINS_IGNORE_CASE__hel&filters=active__EQ__true", undefined);
  });
  it.each(["patients", "doctors"] as const)("encodes reserved characters in %s name searches", async method => {
    vi.mocked(apiInstance.get).mockResolvedValue({ status: 200, data: { entities: [], pagination: {} } });
    await service[method]("José & Ana");
    const url = vi.mocked(apiInstance.get).mock.calls[0][0];
    const params = new URL(String(url), "http://localhost").searchParams;
    expect(params.getAll("filters")).toEqual(["name__CONTAINS_IGNORE_CASE__José & Ana", "active__EQ__true"]);
    expect(params.get("pageSize")).toBe("10");
  });
  it.each(["patients", "doctors"] as const)("rejects failed %s searches rather than interpreting an error as a list", async method => {
    vi.mocked(apiInstance.get).mockRejectedValue({ response: { status: 500, data: {} } });
    await expect(service[method]("hel")).rejects.toThrow();
  });
  it("searches clinic doctors and sends only their ID with the patient when preparing", async () => {
    vi.mocked(apiInstance.get).mockResolvedValue({ status: 200, data: { entities: [{ id: "doctor-a", name: "Doctor ficticio" }], pagination: {} } });
    expect(await service.doctors("Doctor")).toEqual([{ id: "doctor-a", name: "Doctor ficticio" }]);
    expect(apiInstance.get).toHaveBeenCalledWith("/doctor?page=0&pageSize=10&filters=name__CONTAINS_IGNORE_CASE__Doctor&filters=active__EQ__true", undefined);
    vi.mocked(apiInstance.post).mockResolvedValue({ data: wireDocument });
    await service.prepare({ id: "template-a", version: 3 } as DocumentationTemplate, "patient-a", "doctor-a");
    expect(apiInstance.post).toHaveBeenCalledWith("/documentation/documents", { templateId: "template-a", templateVersion: 3, patientId: "patient-a", doctorId: "doctor-a" });
  });
  it("normalizes backend null optional fields so returned templates can be edited and validated", async () => {
    vi.mocked(apiInstance.get).mockResolvedValue({ data: wireTemplate });
    const result = await service.template("template-a");
    expect(result.blocks[0].width).toBeUndefined();
    expect(result.blocks[1].text).toBeUndefined();
    expect(result.sourceId).toBeUndefined();
    expect(templateSchema.safeParse(result).success).toBe(true);
  });
  it("normalizes list and save responses while supplying optimistic version", async () => {
    vi.mocked(apiInstance.get).mockResolvedValue({ data: [wireTemplate] });
    expect((await service.templates(25))[0].blocks[0].width).toBeUndefined();
    expect(apiInstance.get).toHaveBeenCalledWith("/documentation/templates", { params: { offset: 25, limit: 25 } });
    vi.mocked(apiInstance.put).mockResolvedValue({ data: wireTemplate });
    const input = { name: "Consentimiento", blocks: [{ type: "TEXT" as const, text: "Actualizado" }, { type: "SIGNATURE" as const }] };
    const result = await service.save(input, { id: "template-a", version: 2 });
    expect(apiInstance.put).toHaveBeenCalledWith("/documentation/templates/template-a", { ...input, expectedVersion: 2 });
    expect(templateSchema.safeParse(result).success).toBe(true);
  });
  it("uploads multipart without replacing the original and allows OCR server processing time", async () => {
    vi.mocked(apiInstance.post).mockResolvedValue({ data: { sourceId: "source-a", text: "Texto", ocrUsed: true, warnings: [] } });
    const file = new File(["scan"], "document.png", { type: "image/png" });
    await service.importFile(file);
    const [, data, config] = vi.mocked(apiInstance.post).mock.calls[0];
    expect((data as FormData).get("file")).toBe(file);
    expect(config).toMatchObject({ timeout: 210_000, headers: { "Content-Type": "multipart/form-data" } });
  });
  it("prepares a specific template version and normalizes a pending document", async () => {
    vi.mocked(apiInstance.post).mockResolvedValue({ data: wireDocument });
    const document = await service.prepare({ id: "template-a", version: 3 } as DocumentationTemplate, "patient-a");
    expect(apiInstance.post).toHaveBeenCalledWith("/documentation/documents", { templateId: "template-a", templateVersion: 3, patientId: "patient-a" });
    expect(document.signedAt).toBeUndefined();
    expect(document.method).toBeUndefined();
  });
  it("previews and signs the same document hash and explicit acceptance payload", async () => {
    const input: SignatureInput = { method: "CHECKBOX", accepted: true, documentHash: "snapshot-hash" };
    const pdf = new Blob(["%PDF"], { type: "application/pdf" });
    vi.mocked(apiInstance.post).mockResolvedValueOnce({ data: pdf }).mockResolvedValueOnce({ data: { ...wireDocument, status: "SIGNED", method: "CHECKBOX" } });
    expect(await service.previewSignature("document-a", input)).toBe(pdf);
    await service.sign("document-a", input);
    expect(apiInstance.post).toHaveBeenNthCalledWith(1, "/documentation/documents/document-a/preview-signature", input, { responseType: "blob" });
    expect(apiInstance.post).toHaveBeenNthCalledWith(2, "/documentation/documents/document-a/sign", input);
  });
  it.each([401, 403, 404, 409, 500])("propagates HTTP %s instead of treating error bodies as templates", async status => {
    const failure = { response: { status, data: { message: "server detail" } } };
    vi.mocked(apiInstance.get).mockRejectedValue(failure);
    await expect(service.template("template-a")).rejects.toBe(failure);
  });
  it("propagates network failure without manufacturing an empty successful list", async () => {
    const failure = new Error("Network Error");
    vi.mocked(apiInstance.get).mockRejectedValue(failure);
    await expect(service.documents()).rejects.toBe(failure);
  });
});

describe("template free-position wire contract", () => {
  it("normalizes absent position while retaining explicit page and point coordinates through editing and saving", async () => {
    const positioned = {
      ...wireTemplate,
      blocks: [
        { ...wireTemplate.blocks[0], position: null },
        { ...wireTemplate.blocks[1], position: { page: 1, x: 100, y: 400 } },
      ],
    };
    vi.mocked(apiInstance.get).mockResolvedValue({ data: positioned });
    const template = await service.template("template-a");
    expect(template.blocks[0].position).toBeUndefined();
    expect(template.blocks[1].position).toEqual({ page: 1, x: 100, y: 400 });
    const parsed = templateSchema.parse(template);
    vi.mocked(apiInstance.put).mockResolvedValue({ data: positioned });
    await service.save(parsed, template);
    expect(apiInstance.put).toHaveBeenCalledWith("/documentation/templates/template-a", expect.objectContaining({
      blocks: expect.arrayContaining([expect.objectContaining({ position: { page: 1, x: 100, y: 400 } })]), expectedVersion: 3,
    }));
  });
  it("requests the selected PDF page with a cancellable JSON layout request", async () => {
    const controller = new AbortController();
    const input = { name: "Consentimiento", blocks: [{ type: "TEXT" as const, text: "Legal" }, { type: "SIGNATURE" as const }] };
    const layout = { page: 2, pageCount: 3, width: 595.2756, height: 841.8898, imageDataUrl: "data:image/png;base64,page", logoDataUrl: null, placements: [] };
    vi.mocked(apiInstance.post).mockResolvedValue({ data: layout });
    expect(await service.layout(input, 2, controller.signal)).toEqual(layout);
    expect(apiInstance.post).toHaveBeenCalledWith("/documentation/templates/layout", input, { params: { page: 2 }, signal: controller.signal });
  });
});

describe("page break transport", () => {
  it("retains the page target when reloading, validating and saving a revision", async () => {
    const wire = { ...wireTemplate, blocks: [...wireTemplate.blocks, { type: "PAGE_BREAK", page: 3, text: null, width: null, alignment: null, position: null }] };
    vi.mocked(apiInstance.get).mockResolvedValue({ data: wire });
    const template = await service.template("template-a");
    const parsed = templateSchema.parse(template);
    expect(parsed.blocks[2]).toMatchObject({ type: "PAGE_BREAK", page: 3 });
    vi.mocked(apiInstance.put).mockResolvedValue({ data: wire });
    const saved = await service.save(parsed, template);
    expect(saved.blocks[2].page).toBe(3);
    expect(apiInstance.put).toHaveBeenCalledWith("/documentation/templates/template-a", expect.objectContaining({ blocks: expect.arrayContaining([expect.objectContaining({ type: "PAGE_BREAK", page: 3 })]) }));
  });
});
