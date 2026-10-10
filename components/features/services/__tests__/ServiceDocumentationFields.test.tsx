import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/atomic/forms";
import { ServiceDocumentationFields } from "../form/ServiceDocumentationFields";
import { serviceFormSchema, type ServiceFormValues } from "@/lib/hooks/services/service-form.schema";
import { ResizeObserverStub, t } from "./service-test-utils";
const api = vi.hoisted(() => ({ templates: vi.fn() }));
const session = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: api }));
vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ isAdmin: session.isAdmin, permissionsObj: {} }) }));
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t }) }));
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
Element.prototype.scrollIntoView = vi.fn();
const id = "00000000-0000-4000-8000-000000000001";
const submit = vi.fn();
function Harness({ selected = "", required = false }) {
  const form = useForm<ServiceFormValues>({ defaultValues: { documentationTemplateId: selected, documentSignatureRequired: required } });
  return <Form {...form}><form onSubmit={form.handleSubmit(submit)}>
    <ServiceDocumentationFields form={form} disabled={false} /><button type="submit">Guardar</button>
  </form></Form>;
}
beforeEach(() => { vi.clearAllMocks(); session.isAdmin = true; api.templates.mockResolvedValue([{ id, name: "Consentimiento" }]); });
describe("documentación de servicios", () => {
  it("deshabilita firma sin documento, permite elegirlo y guarda firma obligatoria", async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
    expect(screen.getByRole("switch")).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Consentimiento" }));
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][0]).toMatchObject({ documentationTemplateId: id, documentSignatureRequired: true });
  });
  it("quitar el documento apaga la obligatoriedad", async () => {
    render(<Harness selected={id} required />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Sin documento" }));
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(screen.getByRole("switch")).toBeDisabled();
  });
  it("preserva la selección ante error y permite reintentar", async () => {
    api.templates.mockRejectedValueOnce(new Error("offline"));
    render(<Harness selected={id} required />);
    await screen.findByRole("alert");
    expect(screen.getByRole("switch")).toBeChecked();
    fireEvent.click(screen.getByText("Guardar"));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][0].documentationTemplateId).toBe(id);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
  });
  it("no consulta ni cambia documentos sin permiso", () => {
    session.isAdmin = false;
    render(<Harness selected={id} required />);
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(api.templates).not.toHaveBeenCalled();
  });
  it("recorre páginas completas", async () => {
    api.templates.mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: `Documento ${i}` }))).mockResolvedValueOnce([]);
    render(<Harness />);
    await waitFor(() => expect(api.templates).toHaveBeenCalledWith(25, 25));
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
  });
  it("muestra el estado vacío y permite dejar el servicio sin documento", async () => {
    api.templates.mockResolvedValue([]);
    render(<Harness />);
    await screen.findByText("No hay plantillas disponibles. Crea una en Documentación.");
    expect(screen.getByRole("combobox")).toBeEnabled();
    expect(screen.getByRole("switch")).toBeDisabled();
  });
  it("valida la dependencia incluso sin odontograma", () => {
    const result = serviceFormSchema.safeParse({ code: "SVC", name: "Consulta", type: "PROCEDURE", cost: 0, odontogramEnabled: false, odontogramSymbolMode: "NONE", assistantVisible: false, assistantDescription: "", documentationTemplateId: "", documentSignatureRequired: true });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === "documentationTemplateId")).toBe(true);
  });
});
