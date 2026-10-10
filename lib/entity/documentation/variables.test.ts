import { describe, expect, it } from "vitest";
import { DOCUMENT_VARIABLES, documentObservationTitles, documentSelectedDateTitle, needsDoctorVariables, needsSelectedDocumentDate, validDocumentVariables } from "./variables";
import { templateSchema } from "@/lib/validation/documentation";
describe("document variables", () => {
  it("requires a title for observations and lists distinct fields in document order", () => {
    expect(validDocumentVariables("{{observaciones:Riesgos personalizados}} {{ observaciones:Indicaciones }}")).toBe(true);
    for (const text of ["{{observaciones}}", "{{observaciones:}}", "{{observaciones: Riesgos}}", `{{observaciones:${"x".repeat(101)}}}`, "{{observaciones:Una\nOtra}}"])
      expect(validDocumentVariables(text)).toBe(false);
    expect(documentObservationTitles([{type:"TEXT",text:"{{observaciones:Riesgos}} {{observaciones:Indicaciones}} {{observaciones:Riesgos}}"}])).toEqual(["Riesgos","Indicaciones"]);
  });
  it("supports both date sources and the legacy token without accepting unknown properties", () => {
    for (const token of ["fecha_actual", "fecha_documento", "fecha_documento:actual", "fecha_documento:seleccionada"]) expect(validDocumentVariables(`{{${token}}}`)).toBe(true);
    expect(validDocumentVariables("{{fecha_documento:desconocida}}")).toBe(false);
    expect(needsSelectedDocumentDate([{ type: "TEXT", text: "{{ fecha_documento:seleccionada }}" }])).toBe(true);
    expect(needsSelectedDocumentDate([{ type: "TEXT", text: "{{fecha_actual}} {{fecha_documento:actual}}" }])).toBe(false);
    const titled = [{ type: "TEXT" as const, text: "{{fecha_documento:seleccionada:DMY_SLASH:Fecha de cirugía}}" }];
    expect(validDocumentVariables(titled[0].text)).toBe(true);
    expect(documentSelectedDateTitle(titled)).toBe("Fecha de cirugía");
    expect(validDocumentVariables("{{fecha_documento:actual:DMY_SLASH:Título inválido}}" )).toBe(false);
  });
  it("allows the ten data fields, treatment and current date, with optional surrounding whitespace", () => {
    expect(DOCUMENT_VARIABLES).toHaveLength(13);
    for (const variable of DOCUMENT_VARIABLES.filter(item => item.key !== "observaciones")) expect(validDocumentVariables(`{{ ${variable.key} }}`)).toBe(true);
    expect(needsDoctorVariables([{ type: "TEXT", text: "{{ paciente.nombre }}" }])).toBe(false);
    expect(needsDoctorVariables([{ type: "TEXT", text: "{{ doctor.especialidad }}" }])).toBe(true);
  });
  it("accepts patient identification without requiring a doctor", () => {
    expect(templateSchema.safeParse({ name: "Identificación", blocks: [{ type: "TEXT", text: "{{paciente.identificacion}}" }, { type: "SIGNATURE" }] }).success).toBe(true);
    expect(needsDoctorVariables([{ type: "TEXT", text: "{{paciente.identificacion}}" }])).toBe(false);
  });
  it("allows treatment in templates without requiring a doctor", () => {
    expect(templateSchema.safeParse({ name: "Plantilla", blocks: [{ type: "TEXT", text: "Tratamiento: {{tratamiento}}" }, { type: "SIGNATURE" }] }).success).toBe(true);
    expect(needsDoctorVariables([{ type: "TEXT", text: "{{tratamiento}}" }])).toBe(false);
  });
  it("accepts current date without requiring a doctor", () => {
    expect(templateSchema.safeParse({ name: "Fecha", blocks: [{ type: "TEXT", text: "{{fecha_actual}}" }, { type: "SIGNATURE" }] }).success).toBe(true);
    expect(needsDoctorVariables([{ type: "TEXT", text: "{{fecha_actual}}" }])).toBe(false);
  });
  it.each(["{{doctor.email}}", "{{paciente.historia}}", "{{1+2}}", "{{paciente.nombre", "paciente.nombre}}"])("rejects unsupported or malformed variable %s on save", text => {
    expect(templateSchema.safeParse({ name: "Plantilla", blocks: [{ type: "TEXT", text }, { type: "SIGNATURE" }] }).success).toBe(false);
  });
});
