import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResizeObserverStub, makeService, serviceError, t } from "./service-test-utils";

const api = vi.hoisted(() => ({
  getServiceById: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  setAssistantProfile: vi.fn(),
}));
vi.mock("@/lib/services/services", () => ({ servicesService: api }));

vi.mock("@/lib/services/documentation/documentation.service", () => ({ documentationService: { templates: vi.fn().mockResolvedValue([]) } }));

const session = vi.hoisted(() => ({ isAdmin: true, actions: [] as number[] }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({
    can: (_module: string, action: number) => session.actions.includes(action),
    isAdmin: session.isAdmin,
    permissionsObj: {},
  }),
}));
vi.mock("@/lib/contexts/i18n-context", async () => {
  const utils = await import("./service-test-utils");
  return { useI18n: () => ({ t: utils.t, language: "es" }) };
});
vi.mock("@/lib/hooks/settings", () => ({
  useClinicGeneralSettings: () => ({ settings: { currency: "USD" }, loading: false }),
}));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/utils/notify", () => ({ notify }));

import { ServiceForm } from "../form/ServiceForm";
import { PermissionAction } from "@/lib/permissions/permission-actions";

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const DESCRIPTION = "Procedimiento estético que aclara el tono de los dientes";
const visibleSwitch = () => screen.getByRole("switch", { name: t("services.table.assistantVisible") });
const descriptionInput = () => screen.getByLabelText(t("services.form.assistantDescription")) as HTMLInputElement;
// El costo y la duración son los dos únicos campos numéricos, en ese orden.
const costInput = () => document.querySelectorAll('input[type="number"]')[0] as HTMLInputElement;
const save = (edit = true) =>
  screen.getByRole("button", { name: t(edit ? "services.actions.saveChanges" : "services.actions.save") });

async function renderEdit(service = makeService()) {
  api.getServiceById.mockResolvedValue(service);
  render(<ServiceForm serviceId={service.id} />);
  await waitFor(() => expect(screen.getByDisplayValue(service.name)).toBeInTheDocument());
}

describe("sección «Asistente virtual» del formulario de servicio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.isAdmin = true;
    session.actions = [];
    api.updateService.mockResolvedValue(true);
    api.setAssistantProfile.mockImplementation(async (_id: string, profile: { assistantVisible: boolean }) => profile.assistantVisible);
  });

  it("envía la configuración documental cargada al guardar el servicio", async () => {
    const templateId = "00000000-0000-4000-8000-000000000001";
    await renderEdit(makeService({ documentationTemplateId: templateId, documentSignatureRequired: true }));
    fireEvent.change(screen.getByDisplayValue("Blanqueamiento"), { target: { value: "Blanqueamiento actualizado" } });
    fireEvent.click(save());
    await waitFor(() => expect(api.updateService).toHaveBeenCalledTimes(1));
    expect(api.updateService.mock.calls[0][1]).toMatchObject({ documentationTemplateId: templateId, documentSignatureRequired: true });
  });

  it("guarda en dos pasos: primero el servicio sin campos del asistente, luego el perfil", async () => {
    await renderEdit();
    fireEvent.click(visibleSwitch());
    fireEvent.change(descriptionInput(), { target: { value: `  ${DESCRIPTION}  ` } });
    fireEvent.click(save());

    await waitFor(() => expect(api.setAssistantProfile).toHaveBeenCalledTimes(1));
    const servicePayload = api.updateService.mock.calls[0][1];
    expect(servicePayload).not.toHaveProperty("assistantVisible");
    expect(servicePayload).not.toHaveProperty("assistantDescription");
    expect(servicePayload).not.toHaveProperty("clinicId");
    expect(api.setAssistantProfile).toHaveBeenCalledWith("service-1", { assistantVisible: true, assistantDescription: DESCRIPTION });
    expect(api.updateService.mock.invocationCallOrder[0]).toBeLessThan(api.setAssistantProfile.mock.invocationCallOrder[0]);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/settings/services"));
  });

  it("editar nombre, costo o duración no toca la visibilidad ni la descripción", async () => {
    await renderEdit(makeService({ assistantVisible: true, assistantDescription: DESCRIPTION }));
    fireEvent.change(screen.getByDisplayValue("Blanqueamiento"), { target: { value: "Blanqueamiento láser" } });
    fireEvent.click(save());
    await waitFor(() => expect(api.updateService).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(api.setAssistantProfile).not.toHaveBeenCalled();
  });

  it("borrar la descripción la envía como null y conserva la visibilidad", async () => {
    await renderEdit(makeService({ assistantVisible: true, assistantDescription: DESCRIPTION }));
    expect(descriptionInput().value).toBe(DESCRIPTION);
    fireEvent.change(descriptionInput(), { target: { value: "" } });
    fireEvent.click(save());
    await waitFor(() =>
      expect(api.setAssistantProfile).toHaveBeenCalledWith("service-1", { assistantVisible: true, assistantDescription: null }),
    );
  });

  it("al crear usa el id que devuelve el POST para guardar el perfil", async () => {
    api.createService.mockResolvedValue("service-new");
    render(<ServiceForm />);
    fireEvent.change(screen.getByLabelText(/Código/), { target: { value: "VAL-01" } });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Valoración inicial" } });
    fireEvent.change(costInput(), { target: { value: "40" } });
    fireEvent.click(visibleSwitch());
    fireEvent.click(save(false));

    await waitFor(() => expect(api.setAssistantProfile).toHaveBeenCalledWith("service-new", { assistantVisible: true, assistantDescription: null }));
    expect(api.createService.mock.calls[0][0]).not.toHaveProperty("assistantVisible");
  });

  it("si el servicio se guarda y el perfil falla, no cierra y reintenta solo el paso 2", async () => {
    api.createService.mockResolvedValue("service-new");
    api.setAssistantProfile.mockRejectedValueOnce(serviceError(500, "Ocurrió un error en el servidor."));
    render(<ServiceForm />);
    fireEvent.change(screen.getByLabelText(/Código/), { target: { value: "VAL-01" } });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Valoración inicial" } });
    fireEvent.change(costInput(), { target: { value: "40" } });
    fireEvent.click(visibleSwitch());
    fireEvent.click(save(false));

    expect(await screen.findByText(t("services.form.assistantSaveFailed"))).toBeInTheDocument();
    expect(screen.getByText("Ocurrió un error en el servidor.")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    // Solo queda pendiente el perfil: el resto del formulario se bloquea para que nadie crea que se guarda.
    expect(screen.getByText(t("services.form.assistantOnlyPending"))).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toBeDisabled();
    expect(screen.getByLabelText(/Código/)).toBeDisabled();
    expect(costInput()).toBeDisabled();
    expect(visibleSwitch()).toBeEnabled();
    expect(descriptionInput()).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: t("services.form.assistantRetry") }));
    await waitFor(() => expect(api.setAssistantProfile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/settings/services"));
    // El servicio no se vuelve a crear.
    expect(api.createService).toHaveBeenCalledTimes(1);
  });

  it("un 422 muestra el mensaje del backend junto al campo", async () => {
    const message = "La descripción para el asistente debe ser una sola línea de texto.";
    api.setAssistantProfile.mockRejectedValueOnce(serviceError(422, message));
    await renderEdit();
    fireEvent.change(descriptionInput(), { target: { value: DESCRIPTION } });
    fireEvent.click(save());
    await waitFor(() => expect(api.setAssistantProfile).toHaveBeenCalledTimes(1));
    // Junto al campo, una sola vez (el aviso general no lo repite).
    expect(await screen.findByText(message, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(t("services.form.assistantSaveFailed"))).toBeInTheDocument();
    // Al editar se repite el guardado completo: los demás campos siguen editables.
    expect(screen.queryByText(t("services.form.assistantOnlyPending"))).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Blanqueamiento")).toBeEnabled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("no deja pasar de 300 caracteres ni saltos de línea", async () => {
    await renderEdit();
    expect(descriptionInput()).toHaveAttribute("maxLength", "300");
    expect(descriptionInput().tagName).toBe("INPUT");
    // (jsdom ya descarta los saltos de línea de un input; la tabulación llega y se convierte.)
    fireEvent.change(descriptionInput(), { target: { value: "uno\tdos" } });
    expect(descriptionInput().value).toBe("uno dos");
    expect(screen.getByText("7/300")).toBeInTheDocument();

    // Aunque se salte el límite del input, la validación impide enviarlo.
    fireEvent.change(descriptionInput(), { target: { value: "a".repeat(301) } });
    fireEvent.click(save());
    expect(await screen.findByText(t("services.validation.assistantDescriptionMax"))).toBeInTheDocument();
    expect(api.updateService).not.toHaveBeenCalled();
    expect(api.setAssistantProfile).not.toHaveBeenCalled();
  });

  it("en un producto o anticipo el interruptor está deshabilitado", async () => {
    await renderEdit(makeService({ type: "PRODUCT", name: "Cepillo eléctrico" }));
    expect(visibleSwitch()).toBeDisabled();
    expect(screen.getByText(t("services.assistant.typeNotAllowed"))).toBeInTheDocument();
  });

  it("en un servicio inactivo el interruptor está deshabilitado", async () => {
    await renderEdit(makeService({ active: false }));
    expect(visibleSwitch()).toBeDisabled();
    expect(screen.getByText(t("services.assistant.inactiveNotAllowed"))).toBeInTheDocument();
  });

  it("sin permiso de editar servicios la sección queda en solo lectura y no se guarda", async () => {
    session.isAdmin = false;
    session.actions = [PermissionAction.CREATE];
    api.createService.mockResolvedValue("service-new");
    render(<ServiceForm />);
    expect(visibleSwitch()).toBeDisabled();
    expect(descriptionInput()).toBeDisabled();
    expect(screen.getByText(t("services.assistant.noPermission"))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Código/), { target: { value: "VAL-01" } });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Valoración inicial" } });
    fireEvent.change(costInput(), { target: { value: "40" } });
    fireEvent.click(save(false));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(api.setAssistantProfile).not.toHaveBeenCalled();
  });
});
