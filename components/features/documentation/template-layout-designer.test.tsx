import { changeRichText, selectRichText } from "./rich-editor-test-utils";
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateLayoutDesigner } from "./template-layout-designer";
import { documentationService } from "@/lib/services/documentation/documentation.service";
import type { TemplateInput } from "@/lib/entity/documentation";
import { localDocumentLayout } from "./local-document-layout";

vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: { layout: vi.fn(), save: vi.fn() } }));
vi.mock("@/lib/contexts/clinic-branding-context", () => ({ useClinicBranding: () => ({ logoUrl: "data:image/png;base64,logo" }) }));
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/ui", async importOriginal => ({
  ...await importOriginal<typeof import("@/components/ui")>(),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Button: ({ children, disabled, onClick, type }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type={type} disabled={disabled} onClick={onClick}>{children}</button>,
}));
const input: TemplateInput = { name: "Consentimiento", blocks: [
  { type: "TEXT", text: "Contenido legal" },
  { type: "SIGNATURE", width: 160, alignment: "LEFT" },
  { type: "LOGO", width: 120 },
] };
const geometry = localDocumentLayout(input, (text, size) => text.length * size * .5);
const origin = geometry.placements[1];
const signature = () => screen.getByRole("button", { name: "documentation.SIGNATURE 2" });
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ measureText: (text: string) => ({ width: text.length * 5.5 }) } as never);
});

async function open(value = input, onChange = vi.fn()) {
  const mounted = render(<TemplateLayoutDesigner input={value} onChange={onChange} />);
  await screen.findByRole("button", { name: "documentation.TEXT 1" });
  return mounted;
}

describe("local template designer", () => {
  it("keeps variable controls in the sticky toolbar outside the scrolling document", async () => {
    const onChange = vi.fn();
    await open(input, onChange);
    fireEvent.click(screen.getByRole("button", { name: "documentation.TEXT 1" }));
    const toolbar = screen.getByTestId("document-variable-toolbar");
    const selector = screen.getByLabelText("documentation.variable");
    expect(toolbar).toContainElement(selector);
    expect(toolbar.parentElement).toHaveClass("sticky", "top-0");
    expect(screen.getByTestId("layout-page")).not.toContainElement(selector);
    const field=screen.getByRole("textbox", { name: "documentation.TEXT 1" }) as HTMLElement;
    selectRichText(field, 10, 15);
    fireEvent.keyDown(selector, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: /documentation\.treatment/ }));
    expect(onChange).toHaveBeenLastCalledWith(0, expect.objectContaining({ type: "TEXT", text: "Contenido {{tratamiento}}", textStyles: expect.any(Array) }));
    expect(documentationService.layout).not.toHaveBeenCalled();expect(documentationService.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "documentation.applyText" }));
    expect(screen.queryByLabelText("documentation.variable")).not.toBeInTheDocument();
  });
  it("renders text and the clinic logo locally without changing the draft on selection", async () => {
    const onChange = vi.fn();
    await open(input, onChange);
    expect(screen.getByRole("img", { name: "documentation.pageBackground" })).toHaveTextContent("Contenido legal");
    expect(screen.getByAltText("documentation.LOGO")).toHaveAttribute("src", "data:image/png;base64,logo");
    fireEvent.click(signature());
    expect(onChange).not.toHaveBeenCalled();
    expect(documentationService.layout).not.toHaveBeenCalled();
  });
  it("applies revised text on the page without requesting a layout or saving", async () => {
    const onChange = vi.fn();
    await open(input, onChange);
    fireEvent.click(screen.getByRole("button", { name: "documentation.TEXT 1" }));
    changeRichText(screen.getByRole("textbox", { name: "documentation.TEXT 1" }), "Texto revisado");
    fireEvent.click(screen.getByRole("button", { name: "documentation.applyText" }));
    expect(screen.getByRole("img", { name: "documentation.pageBackground" })).toHaveTextContent("Texto revisado");
    expect(screen.getByRole("img", { name: "documentation.pageBackground" })).not.toHaveTextContent("Contenido legal");
    expect(onChange).toHaveBeenLastCalledWith(0, expect.objectContaining({ type: "TEXT", text: "Texto revisado", textStyles: expect.any(Array) }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
    expect(documentationService.layout).not.toHaveBeenCalled();
    expect(documentationService.save).not.toHaveBeenCalled();
  });
  it("supports keyboard placement and expands legacy signatures when moved", async () => {
    const onChange = vi.fn();
    await open(input, onChange);
    fireEvent.keyDown(signature(), { key: "ArrowRight", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ width: 200, position: { page: 0, x: 58, y: Math.floor(origin.y * 100) / 100 } }));
    fireEvent.keyDown(signature(), { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ position: { page: 0, x: 58, y: Math.floor(origin.y * 100) / 100 + 1 } }));
    expect(input.blocks[1].position).toBeUndefined();
  });
  it("converts and clamps pointer movement without requesting a page on release", async () => {
    const onChange = vi.fn();
    await open(input, onChange);
    vi.spyOn(screen.getByTestId("layout-page"), "getBoundingClientRect").mockReturnValue({ width: geometry.width / 2, height: geometry.height / 2 } as DOMRect);
    fireEvent(signature(), new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 50, clientY: 50 }));
    fireEvent(signature(), new MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 75 }));
    expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ position: { page: 0, x: 148, y: Math.floor((origin.y + 50) * 100) / 100 } }));
    fireEvent(signature(), new MouseEvent("pointermove", { bubbles: true, clientX: -500, clientY: -500 }));
    fireEvent(signature(), new MouseEvent("pointerup", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ position: { page: 0, x: 24, y: 24 } }));
    expect(documentationService.layout).not.toHaveBeenCalled();
  });
  it("navigates pages and moves off-page elements locally", async () => {
    const onChange = vi.fn();
    await open({ ...input, blocks: [...input.blocks, { type: "LOGO", position: { page: 1, x: 24, y: 24 } }] }, onChange);
    fireEvent.click(signature());
    fireEvent.click(screen.getByRole("button", { name: "documentation.next" }));
    fireEvent.click(screen.getByRole("button", { name: "documentation.moveToPage" }));
    expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ position: { page: 1, x: 48, y: Math.floor(origin.y * 100) / 100 } }));
    expect(documentationService.layout).not.toHaveBeenCalled();
  });
  it("updates title, width, structure and restored flow locally", async () => {
    const mounted = await open();
    mounted.rerender(<TemplateLayoutDesigner input={{ ...input, name: "Nuevo título", blocks: [...input.blocks, { type: "TEXT", text: "Texto añadido" }] }} onChange={vi.fn()} />);
    expect(screen.getByRole("img", { name: "documentation.pageBackground" })).not.toHaveTextContent("Nuevo título");
    expect(screen.getByRole("img", { name: "documentation.pageBackground" })).toHaveTextContent("Texto añadido");
    fireEvent.click(signature());
    expect(screen.getByLabelText("documentation.width")).toBeInTheDocument();
    expect(screen.getByLabelText("documentation.height")).toBeInTheDocument();
    const corner = screen.getByRole("button", { name: "documentation.resize documentation.SIGNATURE 2 · documentation.resizeSE" });
    for (let step = 0; step < 13; step++) fireEvent.keyDown(corner, { key: "ArrowRight", shiftKey: true });
    expect(signature().style.width).toBe(`${320 / geometry.width * 100}%`);
    fireEvent.keyDown(signature(), { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: "documentation.restoreFlow" }));
    expect(signature().style.left).toBe(`${48 / geometry.width * 100}%`);
    expect(documentationService.layout).not.toHaveBeenCalled();
  });
  it("shows empty draft hints without persisting placeholder content", async () => {
    const onChange = vi.fn();
    await open({ name: "", blocks: [{ type: "TEXT", text: "" }] }, onChange);
    expect(screen.getByRole("img", { name: "documentation.pageBackground" })).toHaveTextContent("documentation.emptyText");
    expect(onChange).not.toHaveBeenCalled();
    expect(documentationService.layout).not.toHaveBeenCalled();
  });
  it("adds the last allowed page locally and prevents adding a 101st page", async () => {
    const onAdd = vi.fn();
    render(<TemplateLayoutDesigner input={{ name: "Límite", blocks: [input.blocks[0], { type: "SIGNATURE", position: { page: 98, x: 24, y: 24 } }] }} onChange={vi.fn()} onAdd={onAdd} />);
    await screen.findByRole("button", { name: "documentation.TEXT 1" });
    fireEvent.click(screen.getByRole("button", { name: "+ documentation.addPage" }));
    expect(onAdd).toHaveBeenCalledWith("PAGE_BREAK", 99);
    expect(screen.getByText("documentation.page 100 / 100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ documentation.addPage" })).toBeDisabled();
    expect(documentationService.layout).not.toHaveBeenCalled();
  });

});

it("resizes signature width and height locally through corner handles", async () => {
  const onChange = vi.fn(); await open(input, onChange); fireEvent.click(signature());
  const handle = screen.getByRole("button", { name: "documentation.resize documentation.SIGNATURE 2 · documentation.resizeSE" });
  vi.spyOn(screen.getByTestId("layout-page"), "getBoundingClientRect").mockReturnValue({ width: geometry.width, height: geometry.height } as DOMRect);
  fireEvent(handle, new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 50, clientY: 50 }));
  fireEvent(handle, new MouseEvent("pointermove", { bubbles: true, clientX: 150, clientY: 110 }));
  fireEvent(handle, new MouseEvent("pointerup", { bubbles: true }));
  expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ width: 260, height: 240, position: expect.objectContaining({ page: 0 }) }));
  expect(documentationService.layout).not.toHaveBeenCalled(); expect(documentationService.save).not.toHaveBeenCalled();
});
it("resizes logos with keyboard without changing their proportions", async () => {
  const onChange = vi.fn(); await open(input, onChange);
  fireEvent.click(screen.getByRole("button", { name: "documentation.LOGO 3" }));
  fireEvent.keyDown(screen.getByRole("button", { name: "documentation.resize documentation.LOGO 3 · documentation.resizeSE" }), { key: "ArrowRight", shiftKey: true });
  expect(onChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ width: 130 }));
  expect(documentationService.layout).not.toHaveBeenCalled();
});

it("refuses resizing into another freely positioned element", async () => {
  const onChange = vi.fn();
  await open({ name: "Prueba", blocks: [{ type: "TEXT", text: "Legal" }, { type: "SIGNATURE", width: 260, position: { page: 0, x: 24, y: 300 } }, { type: "LOGO", width: 120, position: { page: 0, x: 300, y: 300 } }] }, onChange);
  fireEvent.click(signature());
  const corner = screen.getByRole("button", { name: "documentation.resize documentation.SIGNATURE 2 · documentation.resizeSE" });
  fireEvent.keyDown(corner, { key: "ArrowRight", shiftKey: true });
  expect(onChange).not.toHaveBeenCalled();
});

it("adds the logo beside the signature on the visible page without a server request", async () => {
  const onAdd = vi.fn();
  const value: TemplateInput = { name: "Documento", blocks: [{ type: "TEXT", text: "Legal" }, { type: "SIGNATURE", width: 200, position: { page: 0, x: 370, y: 570 } }] };
  render(<TemplateLayoutDesigner input={value} onChange={vi.fn()} onAdd={onAdd} />);
  await screen.findByRole("button", { name: "documentation.TEXT 1" });
  fireEvent.click(signature()); fireEvent.click(screen.getByRole("button", { name: "+ documentation.LOGO" }));
  expect(onAdd).toHaveBeenCalledWith("LOGO", undefined, { page: 0, x: 48, y: 570 });
  expect(documentationService.layout).not.toHaveBeenCalled();
});
it("shrinks the signature vertically at the bottom of a page without changing its width", async () => {
  const onChange = vi.fn();
  await open({ name: "Documento", blocks: [{ type: "TEXT", text: "Legal" }, { type: "SIGNATURE", width: 200, position: { page: 0, x: 370, y: 570 } }] }, onChange);
  fireEvent.click(signature());
  const handle = screen.getByRole("button", { name: "documentation.resize documentation.SIGNATURE 2 · documentation.resizeSE" });
  vi.spyOn(screen.getByTestId("layout-page"), "getBoundingClientRect").mockReturnValue({ width: geometry.width, height: geometry.height } as DOMRect);
  fireEvent(handle, new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 50, clientY: 200 }));
  fireEvent(handle, new MouseEvent("pointermove", { bubbles: true, clientX: 50, clientY: 140 }));
  fireEvent(handle, new MouseEvent("pointerup", { bubbles: true }));
  expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ width: 200, height: 120, position: { page: 0, x: 370, y: 570 } }));
  expect(documentationService.save).not.toHaveBeenCalled();
});

it("changes the signer role locally and offers a separate specialist signature", async () => {
  const onChange = vi.fn(), onAdd = vi.fn();
  render(<TemplateLayoutDesigner input={input} onChange={onChange} onAdd={onAdd} />);
  await screen.findByRole("button", { name: "documentation.TEXT 1" }); fireEvent.click(signature());
  fireEvent.change(screen.getByRole("combobox", { name: "documentation.signerRole" }), { target: { value: "SPECIALIST" } });
  expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ signerRole: "SPECIALIST" }));
  expect(signature()).toHaveTextContent("documentation.specialistSignature");
  fireEvent.click(screen.getByRole("button", { name: "+ documentation.specialistSignature" }));
  expect(onAdd).toHaveBeenCalledWith("SIGNATURE", undefined, undefined, "SPECIALIST");
  expect(documentationService.save).not.toHaveBeenCalled();
});

it("edits size and coordinates through numeric fields without requesting or saving", async () => {
  const onChange = vi.fn(); await open(input, onChange); fireEvent.click(signature());
  fireEvent.change(screen.getByLabelText("documentation.width"), { target: { value: "280" } });
  fireEvent.change(screen.getByLabelText("documentation.height"), { target: { value: "140" } });
  fireEvent.change(screen.getByLabelText("documentation.positionX"), { target: { value: "300" } });
  fireEvent.change(screen.getByLabelText("documentation.positionY"), { target: { value: "500" } });
  expect(onChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ width: 280, height: 140, position: { page: 0, x: 291.27, y: 500 } }));
  expect(screen.getByLabelText("documentation.positionX")).toHaveValue(291.27);
  expect(documentationService.layout).not.toHaveBeenCalled(); expect(documentationService.save).not.toHaveBeenCalled();
});
it("keeps logo proportions when its numeric width changes", async () => {
  const onChange = vi.fn(); await open(input, onChange); fireEvent.click(screen.getByRole("button", { name: "documentation.LOGO 3" }));
  fireEvent.change(screen.getByLabelText("documentation.width"), { target: { value: "160" } });
  fireEvent.change(screen.getByLabelText("documentation.positionX"), { target: { value: "350" } });
  const logo = screen.getByRole("button", { name: "documentation.LOGO 3" });
  expect(logo.style.width).toBe(`${160 / geometry.width * 100}%`);
  expect(logo.style.height).toBe(`${160 / geometry.height * 100}%`);
  expect(onChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ width: 160, position: expect.objectContaining({ x: 350 }) }));
});
