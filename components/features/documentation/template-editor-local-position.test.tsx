import { changeRichText, selectRichText } from "./rich-editor-test-utils";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateEditor } from "./template-editor";
import { documentationService } from "@/lib/services/documentation/documentation.service";
import type { TemplateInput } from "@/lib/entity/documentation";

vi.mock("@/lib/contexts/clinic-branding-context", () => ({ useClinicBranding: () => ({ logoUrl: null }) }));
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: {
  layout: vi.fn(async (input: TemplateInput) => ({ page: 0, pageCount: 1, width: 595.2756, height: 841.8898,
    imageDataUrl: "data:image/png;base64,page", logoDataUrl: null, placements: [
      { blockIndex: 0, type: "TEXT", page: 0, x: 48, y: 130, width: 499, height: 32 },
      { blockIndex: 1, type: "SIGNATURE", page: 0, x: input.blocks[1].position?.x ?? 48, y: 220, width: 260, height: 180 },
    ] })),
  importFile: vi.fn(),
  save: vi.fn(async (input: TemplateInput) => ({ ...input, id: "template-id", version: 1, createdAt: "2026-10-03T12:00:00Z" })),
} }));

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ measureText: (text: string) => ({ width: text.length * 5.5 }) } as never); });

describe("template editor local positions", () => {
  it("inserts patient and doctor variables at the cursor and saves the tokens only on explicit submit", async () => {
    render(<TemplateEditor onSaved={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("documentation.name"), { target: { value: "Con variables" } });
    fireEvent.click(await screen.findByRole("button", { name: "documentation.TEXT 1" }));
    const textarea = screen.getByRole("textbox", { name: "documentation.TEXT 1" }) as HTMLElement;
    changeRichText(textarea, "Paciente: ; doctor: ");
    selectRichText(textarea, 10, 10);
    fireEvent.click(screen.getByLabelText("documentation.variable"));
    fireEvent.click(await screen.findByRole("option", { name: /documentation\.patientName/ }));
    expect(textarea.textContent).toBe("Paciente: {{paciente.nombre}}; doctor: ");
    selectRichText(textarea, (textarea.textContent ?? "").length, (textarea.textContent ?? "").length);
    fireEvent.keyDown(screen.getByLabelText("documentation.variable"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: /documentation\.doctorLicense/ }));
    expect(textarea.textContent).toBe("Paciente: {{paciente.nombre}}; doctor: {{doctor.licencia}}");
    selectRichText(textarea, (textarea.textContent ?? "").length, (textarea.textContent ?? "").length);
    fireEvent.keyDown(screen.getByLabelText("documentation.variable"), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: /documentation\.treatment/ }));
    expect(textarea.textContent).toBe("Paciente: {{paciente.nombre}}; doctor: {{doctor.licencia}}{{tratamiento}}");
    fireEvent.click(screen.getByRole("button", { name: "documentation.applyText" }));
    expect(documentationService.layout).not.toHaveBeenCalled(); expect(documentationService.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "documentation.save" }));
    await waitFor(() => expect(documentationService.save).toHaveBeenCalledTimes(1));
    expect(documentationService.save).toHaveBeenCalledWith(expect.objectContaining({ blocks: expect.arrayContaining([expect.objectContaining({ text: "Paciente: {{paciente.nombre}}; doctor: {{doctor.licencia}}{{tratamiento}}" })]) }), undefined);
  });
  it("persists the latest coordinates only when the user submits the form", async () => {
    const onSaved = vi.fn();
    render(<TemplateEditor onSaved={onSaved} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("documentation.name"), { target: { value: "Consentimiento" } });
    fireEvent.click(await screen.findByRole("button", { name: "documentation.TEXT 1" }));
    changeRichText(screen.getByRole("textbox", { name: "documentation.TEXT 1" }), "Texto legal de prueba.");
    fireEvent.click(screen.getByRole("button", { name: "documentation.applyText" }));
    await screen.findByRole("button", { name: "documentation.SIGNATURE 2" });
    const callsBeforeMoving = vi.mocked(documentationService.layout).mock.calls.length;
    const signature = screen.getByRole("button", { name: "documentation.SIGNATURE 2" });
    fireEvent.keyDown(signature, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(signature, { key: "ArrowDown", shiftKey: true });
    fireEvent.click(signature);
    const corner = screen.getByRole("button", { name: "documentation.resize documentation.SIGNATURE 2 · documentation.resizeSE" });
    fireEvent.keyDown(corner, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(corner, { key: "ArrowDown", shiftKey: true });
    fireEvent.change(screen.getByLabelText("documentation.positionX"), { target: { value: "200.25" } });
    fireEvent.change(screen.getByLabelText("documentation.positionY"), { target: { value: "400.75" } });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)); });
    expect(callsBeforeMoving).toBe(0);
    expect(documentationService.layout).not.toHaveBeenCalled();
    expect(documentationService.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "documentation.save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(documentationService.save).toHaveBeenCalledTimes(1);
    expect(documentationService.save).toHaveBeenCalledWith(expect.objectContaining({ name: "Consentimiento", blocks: [
      expect.objectContaining({ type: "TEXT", text: "Texto legal de prueba." }),
      { type: "SIGNATURE", alignment: "LEFT", width: 270, height: 190, position: { page: 0, x: 200.25, y: 400.75 } },
    ] }), undefined);
  });
  it("adds blank pages locally, edits text on the new page, and persists them only when saved", async () => {
    const onSaved = vi.fn();
    render(<TemplateEditor onSaved={onSaved} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("documentation.name"), { target: { value: "Varias páginas" } });
    fireEvent.click(await screen.findByRole("button", { name: "documentation.TEXT 1" }));
    changeRichText(screen.getByRole("textbox", { name: "documentation.TEXT 1" }), "Texto original");
    fireEvent.click(screen.getByRole("button", { name: "documentation.applyText" }));
    fireEvent.click(screen.getByRole("button", { name: "+ documentation.addPage" }));
    expect(screen.getByText("documentation.page 2 / 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "documentation.TEXT 1" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ documentation.TEXT" }));
    fireEvent.click(await screen.findByRole("button", { name: "documentation.TEXT 4" }));
    changeRichText(screen.getByRole("textbox", { name: "documentation.TEXT 4" }), "Texto segunda página");
    fireEvent.click(screen.getByRole("button", { name: "documentation.applyText" }));
    fireEvent.click(screen.getByRole("button", { name: "+ documentation.addPage" }));
    expect(screen.getByText("documentation.page 3 / 3")).toBeInTheDocument();
    expect(documentationService.layout).not.toHaveBeenCalled();
    expect(documentationService.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "documentation.save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(documentationService.save).toHaveBeenCalledTimes(1);
    expect(documentationService.save).toHaveBeenCalledWith(expect.objectContaining({ blocks: [
      expect.objectContaining({ type: "TEXT", text: "Texto original" }), { type: "SIGNATURE", alignment: "LEFT", width: 260 },
      { type: "PAGE_BREAK", page: 1 }, expect.objectContaining({ type: "TEXT", text: "Texto segunda página", textStyles: expect.any(Array) }), { type: "PAGE_BREAK", page: 2 },
    ] }), undefined);
  });

  it("replaces text, logo, signatures and pages after a successful import and saves only the replacement", async () => {
    vi.mocked(documentationService.importFile).mockResolvedValue({ sourceId: "new-source", text: "Texto importado", ocrUsed: false, warnings: [] });
    const onSaved = vi.fn();
    render(<TemplateEditor template={{ id: "original", name: "Existente", version: 2, createdAt: "2026-10-03", sourceId: "old-source", blocks: [{ type: "TEXT", text: "Texto antiguo" }, { type: "SIGNATURE", width: 260 }, { type: "LOGO", width: 120, position: { page: 1, x: 24, y: 24 } }, { type: "PAGE_BREAK", page: 2 }] }} onSaved={onSaved} onCancel={vi.fn()} />);
    await screen.findByRole("button", { name: "documentation.TEXT 1" });
    fireEvent.click(screen.getByRole("button", { name: "documentation.next" }));
    fireEvent.drop(screen.getByRole("button", { name: "documentation.import" }), { dataTransfer: { files: [new File(["word"], "prueba.docx")] } });
    await waitFor(() => expect(screen.getByRole("img", { name: "documentation.pageBackground" })).toHaveTextContent("Texto importado"));
    expect(screen.getByText("documentation.page 1 / 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "documentation.SIGNATURE 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /documentation.LOGO/ })).not.toBeInTheDocument();
    expect(documentationService.save).not.toHaveBeenCalled(); expect(documentationService.layout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "+ documentation.patientSignature" }));
    fireEvent.click(screen.getByRole("button", { name: "documentation.save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(documentationService.save).toHaveBeenCalledWith(expect.objectContaining({ sourceId: "new-source", blocks: [{ type: "TEXT", text: "Texto importado" }, { type: "SIGNATURE", alignment: "LEFT", width: 260 }] }), expect.objectContaining({ id: "original" }));
  });
  it("preserves the draft when import fails", async () => {
    vi.mocked(documentationService.importFile).mockRejectedValue(new Error("Import failed"));
    render(<TemplateEditor template={{ id: "original", name: "Existente", version: 1, createdAt: "2026-10-03", blocks: [{ type: "TEXT", text: "Texto intacto" }, { type: "SIGNATURE", width: 260 }] }} onSaved={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole("button", { name: "documentation.TEXT 1" });
    fireEvent.drop(screen.getByRole("button", { name: "documentation.import" }), { dataTransfer: { files: [new File(["word"], "prueba.docx")] } });
    await screen.findByRole("alert");
    expect(screen.getByRole("img", { name: "documentation.pageBackground" })).toHaveTextContent("Texto intacto");
    expect(screen.getByRole("button", { name: "documentation.SIGNATURE 2" })).toBeInTheDocument();
    expect(documentationService.save).not.toHaveBeenCalled();
  });
  it("deletes a page locally and saves only remaining content", async () => {
    const onSaved = vi.fn();
    render(<TemplateEditor template={{ id: "original", name: "Dos páginas", version: 1, createdAt: "2026-10-03", blocks: [{ type: "TEXT", text: "Primera" }, { type: "SIGNATURE", width: 260 }, { type: "PAGE_BREAK", page: 1 }, { type: "TEXT", text: "Segunda" }, { type: "LOGO", width: 120 }] }} onSaved={onSaved} onCancel={vi.fn()} />);
    await screen.findByRole("button", { name: "documentation.TEXT 1" });
    fireEvent.click(screen.getByRole("button", { name: "documentation.next" }));
    fireEvent.click(screen.getByRole("button", { name: "documentation.deletePage" }));
    expect(screen.getByText("documentation.page 1 / 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "documentation.deletePage" })).toBeDisabled();
    expect(documentationService.save).not.toHaveBeenCalled(); expect(documentationService.layout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "documentation.save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(documentationService.save).toHaveBeenCalledWith(expect.objectContaining({ blocks: [{ type: "TEXT", text: "Primera" }, { type: "SIGNATURE", width: 260 }] }), expect.objectContaining({ id: "original" }));
  });
});
