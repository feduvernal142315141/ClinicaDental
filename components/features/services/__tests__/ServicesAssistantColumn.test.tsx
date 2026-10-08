import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ResizeObserverStub, makeService, serviceError, t } from "./service-test-utils";

const api = vi.hoisted(() => ({
  getServices: vi.fn(),
  setAssistantProfile: vi.fn(),
  hasAssistantVisibleServices: vi.fn(),
  setOdontogramVisibility: vi.fn(),
  toggleServiceStatus: vi.fn(),
}));
vi.mock("@/lib/services/services", () => ({ servicesService: api }));

const session = vi.hoisted(() => ({ isAdmin: true }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => false, isAdmin: session.isAdmin, permissionsObj: {} }),
}));
vi.mock("@/lib/contexts/i18n-context", async () => {
  const utils = await import("./service-test-utils");
  return { useI18n: () => ({ t: utils.t, language: "es" }) };
});
vi.mock("@/lib/hooks/settings", () => ({
  useClinicGeneralSettings: () => ({ settings: { currency: "USD" }, loading: false }),
}));
vi.mock("@/lib/hooks/services/use-services-page", () => ({
  useServicesPage: () => ({ handleEditService: vi.fn() }),
}));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/utils/notify", () => ({ notify }));

import { ServicesList } from "../services-list/ServicesList";

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const NOTICE = t("services.assistant.firstTimeNotice");
const page = (entities: unknown[]) => ({ entities, pagination: { page: 0, pageSize: 10, total: entities.length } });
const assistantSwitch = (name: string, visible = false) =>
  screen.getByRole("switch", {
    name: t(visible ? "services.assistant.hideAria" : "services.assistant.showAria").replace("{name}", name),
  });

async function renderList(entities: unknown[], hasVisible: boolean | null = false) {
  api.getServices.mockResolvedValue(page(entities));
  api.hasAssistantVisibleServices.mockImplementation(async () => {
    if (hasVisible === null) throw new Error("filtro no admitido");
    return hasVisible;
  });
  render(<ServicesList />);
  await screen.findByText((entities[0] as { name: string }).name);
}

describe("columna «Visible para el asistente»", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.isAdmin = true;
  });

  it("los servicios existentes aparecen apagados y se muestra el aviso de primera vez", async () => {
    await renderList([makeService()]);
    expect(assistantSwitch("Blanqueamiento")).toHaveAttribute("aria-checked", "false");
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    expect(screen.getByText(t("services.table.assistantVisibleHelp"))).toBeInTheDocument();
  });

  it("al activar reenvía la descripción de la fila y oculta el aviso", async () => {
    api.setAssistantProfile.mockResolvedValue(true);
    await renderList([makeService({ assistantDescription: "Aclara el tono de los dientes" })]);
    await screen.findByText(NOTICE);
    fireEvent.click(assistantSwitch("Blanqueamiento"));

    await waitFor(() => expect(api.setAssistantProfile).toHaveBeenCalledTimes(1));
    expect(api.setAssistantProfile).toHaveBeenCalledWith("service-1", {
      assistantVisible: true,
      assistantDescription: "Aclara el tono de los dientes",
    });
    await waitFor(() => expect(assistantSwitch("Blanqueamiento", true)).toHaveAttribute("aria-checked", "true"));
    await waitFor(() => expect(screen.queryByText(NOTICE)).not.toBeInTheDocument());
    expect(notify.success).toHaveBeenCalled();
  });

  it("al apagar tampoco borra la descripción guardada", async () => {
    api.setAssistantProfile.mockResolvedValue(false);
    await renderList([makeService({ assistantVisible: true, assistantDescription: "Aclara el tono de los dientes" })], true);
    fireEvent.click(assistantSwitch("Blanqueamiento", true));
    await waitFor(() =>
      expect(api.setAssistantProfile).toHaveBeenCalledWith("service-1", {
        assistantVisible: false,
        assistantDescription: "Aclara el tono de los dientes",
      }),
    );
  });

  it("si el backend rechaza el cambio, revierte y muestra su mensaje", async () => {
    const message = "Solo los tratamientos y procedimientos pueden mostrarse al asistente; los productos y anticipos no.";
    api.setAssistantProfile.mockRejectedValue(serviceError(400, message));
    await renderList([makeService()]);
    fireEvent.click(assistantSwitch("Blanqueamiento"));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith(message, expect.anything()));
    expect(assistantSwitch("Blanqueamiento")).toHaveAttribute("aria-checked", "false");
  });

  it("con un 404 recarga la lista", async () => {
    api.setAssistantProfile.mockRejectedValue(serviceError(404, "El servicio no existe."));
    await renderList([makeService()]);
    const calls = api.getServices.mock.calls.length;
    fireEvent.click(assistantSwitch("Blanqueamiento"));
    await waitFor(() => expect(api.getServices.mock.calls.length).toBeGreaterThan(calls));
    expect(notify.error).toHaveBeenCalledWith("El servicio no existe.", expect.anything());
  });

  it("con un 403 la columna pasa a solo lectura", async () => {
    api.setAssistantProfile.mockRejectedValue(serviceError(403, "No tienes permiso para esta acción"));
    await renderList([makeService()]);
    fireEvent.click(assistantSwitch("Blanqueamiento"));
    expect(await screen.findByText(t("services.assistant.noPermission"))).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /al asistente/ })).not.toBeInTheDocument();
  });

  it("deshabilita el interruptor en productos, anticipos e inactivos, con su ayuda", async () => {
    await renderList([
      makeService({ id: "p", name: "Cepillo eléctrico", type: "PRODUCT" }),
      makeService({ id: "a", name: "Anticipo de ortodoncia", type: "ADVANCE" }),
      makeService({ id: "i", name: "Limpieza antigua", active: false }),
    ]);
    expect(assistantSwitch("Cepillo eléctrico")).toBeDisabled();
    expect(assistantSwitch("Anticipo de ortodoncia")).toBeDisabled();
    expect(assistantSwitch("Limpieza antigua")).toBeDisabled();
    expect(screen.getAllByText(t("services.assistant.typeNotAllowed"))).toHaveLength(2);
    expect(screen.getByText(t("services.assistant.inactiveNotAllowed"))).toBeInTheDocument();
  });

  it("avisa en la fila si un servicio visible no tiene duración o precio", async () => {
    await renderList(
      [
        makeService({ id: "d", name: "Valoración", assistantVisible: true, duration: undefined }),
        makeService({ id: "c", name: "Control", assistantVisible: true, cost: 0 }),
        makeService({ id: "o", name: "Oculto sin datos", cost: 0, duration: 0 }),
      ],
      true,
    );
    const row = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
    expect(within(row("Valoración")).getByText(t("services.assistant.missingDuration"))).toBeInTheDocument();
    expect(within(row("Control")).getByText(t("services.assistant.missingPrice"))).toBeInTheDocument();
    expect(within(row("Oculto sin datos")).queryByText(/a confirmar por la clínica/)).not.toBeInTheDocument();
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it("sin permiso de editar servicios la columna es de solo lectura", async () => {
    session.isAdmin = false;
    await renderList([makeService({ assistantVisible: true })], true);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText(t("services.assistant.visible"))).toBeInTheDocument();
    expect(api.setAssistantProfile).not.toHaveBeenCalled();
  });

  it("si no se puede saber si hay servicios visibles, no muestra el aviso a ciegas", async () => {
    await renderList([makeService()], null);
    await waitFor(() => expect(api.hasAssistantVisibleServices).toHaveBeenCalled());
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });
});
