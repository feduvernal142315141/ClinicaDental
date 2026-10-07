import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentVariableText } from "./document-variable-text";
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
function Editor() {
  const [value, setValue] = useState("Texto previo\n".repeat(100));
  return <DocumentVariableText label="Texto" value={value} onChange={setValue} textareaClassName="h-64" />;
}
describe("variable insertion scroll", () => {
  it.each(["actual", "seleccionada"])("inserts the document date with its %s source property", async mode => {
    render(<Editor />);
    const field=screen.getByRole("textbox", { name: "Texto" }) as HTMLTextAreaElement;
    field.setSelectionRange(6,12);
    fireEvent.change(screen.getByRole("combobox", { name: "documentation.variable" }), { target: { value: "fecha_documento" } });
    fireEvent.change(screen.getByRole("combobox", { name: "documentation.dateSource" }), { target: { value: mode } });
    fireEvent.click(screen.getByRole("button", { name: "documentation.insertVariable" }));
    await waitFor(() => expect(field.value.startsWith(`Texto {{fecha_documento:${mode}}}\nTexto previo`)).toBe(true));
  });
  it("inserts the patient identification token at the selected position", async () => {
    render(<Editor />);
    const field = screen.getByRole("textbox", { name: "Texto" }) as HTMLTextAreaElement;
    field.setSelectionRange(6, 12);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "paciente.identificacion" } });
    fireEvent.click(screen.getByRole("button", { name: "documentation.insertVariable" }));
    await waitFor(() => expect(field.value.startsWith("Texto {{paciente.identificacion}}\nTexto previo")).toBe(true));
  });
  it("returns focus without scrolling the document and preserves text viewport and cursor", async () => {
    render(<Editor />);
    const field = screen.getByRole("textbox", { name: "Texto" }) as HTMLTextAreaElement;
    field.setSelectionRange(6, 12);
    field.scrollTop = 120;field.scrollLeft = 8;
    const focus = vi.spyOn(field, "focus");
    fireEvent.click(screen.getByRole("button", { name: "documentation.insertVariable" }));
    await waitFor(() => expect(focus).toHaveBeenCalledWith({ preventScroll: true }));
    expect(field.scrollTop).toBe(120);expect(field.scrollLeft).toBe(8);
    expect(field.selectionStart).toBe(6 + "{{paciente.nombre}}".length);
    expect(field.selectionEnd).toBe(field.selectionStart);
    expect(field.value.startsWith("Texto {{paciente.nombre}}\nTexto previo")).toBe(true);
  });
});
