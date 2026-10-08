import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { LeadPublicBookingSettings } from "@/lib/entity/leads";
import { leadError, renderWithQuery } from "./lead-test-utils";

const service = vi.hoisted(() => ({ getPublicBookingSettings: vi.fn(), updatePublicBookingSettings: vi.fn() }));
vi.mock("@/lib/services/leads/leads.service", () => ({ leadsService: service }));

const catalogs = vi.hoisted(() => ({ getDoctors: vi.fn(), getServices: vi.fn() }));
vi.mock("@/lib/services/doctors", () => ({ doctorsService: { getDoctors: catalogs.getDoctors } }));
vi.mock("@/lib/services/services", () => ({ servicesService: { getServices: catalogs.getServices } }));

const session = vi.hoisted(() => ({ isAdmin: true, permissionsObj: {} as Record<string, number> }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => true, isAdmin: session.isAdmin, permissionsObj: session.permissionsObj }),
}));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/utils/notify", () => ({ notify }));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { LeadSettingsPage } from "../settings/LeadSettingsPage";

// jsdom no trae ResizeObserver y los interruptores y casillas de Radix lo usan.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

// Solo datos ficticios.
const DOCTORS = [
  { id: "doctor-1", name: "Ana Prueba", specialty: "Ortodoncia", active: true },
  { id: "doctor-2", name: "Bruno Ejemplo", specialty: "", active: true },
];
const SERVICES = [
  { id: "service-1", name: "Limpieza dental", duration: 30, active: true },
  { id: "service-2", name: "Valoración", duration: 45, active: true },
  { id: "service-3", name: "Blanqueamiento", active: true },
];

function settings(overrides: Partial<LeadPublicBookingSettings> = {}): LeadPublicBookingSettings {
  return {
    enabled: false,
    publiclyAvailable: false,
    doctorIds: [],
    services: [],
    minAdvanceMinutes: 120,
    maxAdvanceDays: 30,
    slotIntervalMinutes: 30,
    version: 0,
    ...overrides,
  };
}

const ACTIVE = settings({
  enabled: true,
  publiclyAvailable: true,
  doctorIds: ["doctor-1"],
  services: [{ serviceId: "service-1", doctorIds: [] }],
  version: 3,
});

async function renderPage(initial: LeadPublicBookingSettings = settings()) {
  service.getPublicBookingSettings.mockResolvedValue(initial);
  renderWithQuery(<LeadSettingsPage />);
  await screen.findByRole("checkbox", { name: /Ana Prueba/ });
  await screen.findByRole("checkbox", { name: "Limpieza dental" });
}

const saveButton = () => screen.getByRole("button", { name: "Guardar cambios" });
const enabledSwitch = () => screen.getByRole("switch", { name: "Permitir que los prospectos agenden desde el sitio web" });

describe("Reservas en línea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.isAdmin = true;
    session.permissionsObj = {};
    catalogs.getDoctors.mockResolvedValue({ entities: DOCTORS });
    catalogs.getServices.mockResolvedValue({ entities: SERVICES });
  });

  it("una clínica sin configuración ve todo apagado y con los valores por defecto", async () => {
    await renderPage();
    expect(enabledSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Desactivado")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Ana Prueba/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("checkbox", { name: "Limpieza dental" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByLabelText("Anticipación mínima")).toHaveTextContent("2 h");
    expect(screen.getByLabelText("Reservar hasta con")).toHaveTextContent("30 días de anticipación");
    expect(screen.getByLabelText("Intervalo entre horarios")).toHaveTextContent("30 min");
    expect(saveButton()).toBeDisabled();
    expect(catalogs.getDoctors).toHaveBeenCalledWith(expect.objectContaining({ onlyProviders: true }));
  });

  it("no deja activar sin doctores ni servicios: avisa antes de enviar", async () => {
    await renderPage();
    fireEvent.click(enabledSwitch());
    expect(await screen.findByText("Para activar las reservas en línea elige al menos un doctor y un servicio.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(service.updatePublicBookingSettings).not.toHaveBeenCalled();
  });

  it("activa con un doctor y un servicio, guarda el contrato exacto y muestra el estado nuevo", async () => {
    service.updatePublicBookingSettings.mockResolvedValue({ ...ACTIVE, version: 1 });
    await renderPage();
    fireEvent.click(enabledSwitch());
    fireEvent.click(screen.getByRole("checkbox", { name: /Ana Prueba/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Limpieza dental" }));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    // Nada se guarda al cambiar un control.
    expect(service.updatePublicBookingSettings).not.toHaveBeenCalled();

    fireEvent.click(saveButton());
    await waitFor(() => expect(service.updatePublicBookingSettings).toHaveBeenCalledTimes(1));
    expect(service.updatePublicBookingSettings).toHaveBeenCalledWith({
      enabled: true,
      doctorIds: ["doctor-1"],
      services: [{ serviceId: "service-1", doctorIds: [] }],
      minAdvanceMinutes: 120,
      maxAdvanceDays: 30,
      slotIntervalMinutes: 30,
      version: 0,
    });
    expect(await screen.findByText("Activo en tu sitio web")).toBeInTheDocument();
    expect(notify.success).toHaveBeenCalled();
    expect(saveButton()).toBeDisabled();
  });

  it("muestra el estado ámbar si está activado pero el sitio aún no toma reservas", async () => {
    await renderPage({ ...ACTIVE, publiclyAvailable: false });
    expect(screen.getByText("Activado, pero aún no disponible en el sitio. Contacta a soporte.")).toBeInTheDocument();
  });

  it("con un conflicto de versión avisa y ofrece recargar, sin reintentar", async () => {
    service.updatePublicBookingSettings.mockRejectedValue(leadError(409, "BOOKING_SETTINGS_VERSION_CONFLICT"));
    await renderPage(ACTIVE);
    fireEvent.click(screen.getByRole("checkbox", { name: /Bruno Ejemplo/ }));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    expect(await screen.findByText("Otra persona modificó esta configuración")).toBeInTheDocument();
    expect(service.updatePublicBookingSettings).toHaveBeenCalledTimes(1);
    expect(saveButton()).toBeDisabled();
    // Lo editado sigue en pantalla hasta que el usuario decide recargar.
    expect(screen.getByRole("checkbox", { name: /Bruno Ejemplo/ })).toHaveAttribute("aria-checked", "true");

    service.getPublicBookingSettings.mockResolvedValue({ ...ACTIVE, enabled: false, publiclyAvailable: false, version: 4 });
    fireEvent.click(screen.getByRole("button", { name: "Recargar" }));
    expect(await screen.findByText("Desactivado")).toBeInTheDocument();
    expect(screen.queryByText("Otra persona modificó esta configuración")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Bruno Ejemplo/ })).toHaveAttribute("aria-checked", "false");
    expect(service.updatePublicBookingSettings).toHaveBeenCalledTimes(1);
  });

  it("muestra el mensaje del backend en un BOOKING_SETTINGS_INVALID y conserva lo editado", async () => {
    const message = "La clínica debe configurar una zona horaria válida antes de activar las reservas en línea.";
    service.updatePublicBookingSettings.mockRejectedValue(leadError(400, "BOOKING_SETTINGS_INVALID", message));
    await renderPage(ACTIVE);
    fireEvent.click(screen.getByRole("checkbox", { name: /Bruno Ejemplo/ }));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Bruno Ejemplo/ })).toHaveAttribute("aria-checked", "true");
    expect(saveButton()).toBeEnabled();
  });

  it("sin permiso de gestionar se ve en solo lectura, sin botón Guardar", async () => {
    session.isAdmin = false;
    session.permissionsObj = { leads: 1 };
    await renderPage(ACTIVE);
    expect(screen.getByText(/Solo lectura/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(enabledSwitch()).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /Ana Prueba/ })).toBeDisabled();
  });

  it("si el backend responde 403 al guardar, pasa a solo lectura", async () => {
    service.updatePublicBookingSettings.mockRejectedValue(leadError(403, undefined, "No tienes permiso para esta acción"));
    await renderPage(ACTIVE);
    fireEvent.click(screen.getByRole("checkbox", { name: /Bruno Ejemplo/ }));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    expect(await screen.findByText("No tienes permiso para esta acción")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(enabledSwitch()).toBeDisabled();
  });

  it("un servicio sin duración aparece deshabilitado con enlace al catálogo", async () => {
    await renderPage();
    expect(screen.getByRole("checkbox", { name: "Blanqueamiento" })).toBeDisabled();
    const note = screen.getByText(/Configura su duración en el catálogo para ofrecerlo en línea/);
    expect(within(note).getByRole("link", { name: "Ir al catálogo" })).toHaveAttribute("href", "/settings/services");
  });

  it("marca lo que ya no está disponible y lo quita al guardar", async () => {
    const stored = settings({
      enabled: true,
      publiclyAvailable: true,
      doctorIds: ["doctor-1", "doctor-gone"],
      services: [
        { serviceId: "service-1", doctorIds: ["doctor-1", "doctor-gone"] },
        { serviceId: "service-gone", doctorIds: [] },
      ],
      version: 5,
    });
    service.updatePublicBookingSettings.mockResolvedValue({
      ...stored,
      doctorIds: ["doctor-1"],
      services: [{ serviceId: "service-1", doctorIds: ["doctor-1"] }],
      version: 6,
    });
    await renderPage(stored);
    expect(await screen.findAllByText("Ya no disponible")).toHaveLength(2);
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    await waitFor(() => expect(service.updatePublicBookingSettings).toHaveBeenCalledTimes(1));
    expect(service.updatePublicBookingSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        doctorIds: ["doctor-1"],
        services: [{ serviceId: "service-1", doctorIds: ["doctor-1"] }],
        version: 5,
      }),
    );
    await waitFor(() => expect(screen.queryByText("Ya no disponible")).not.toBeInTheDocument());
  });

  it("muestra un valor guardado fuera de las opciones sin cambiarlo", async () => {
    await renderPage(settings({ minAdvanceMinutes: 45, version: 2 }));
    expect(screen.getByLabelText("Anticipación mínima")).toHaveTextContent("45 min");
    expect(saveButton()).toBeDisabled();
  });

  it("descartar vuelve a lo guardado y avisa al salir con cambios", async () => {
    await renderPage(ACTIVE);
    fireEvent.click(screen.getByRole("checkbox", { name: /Bruno Ejemplo/ }));
    fireEvent.click(screen.getByRole("link", { name: "Adquisición de pacientes" }));
    expect(await screen.findByText("Tienes cambios sin guardar")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));

    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /Bruno Ejemplo/ })).toHaveAttribute("aria-checked", "false"));
    expect(saveButton()).toBeDisabled();
  });

  it("si falla la carga ofrece reintentar", async () => {
    service.getPublicBookingSettings.mockRejectedValueOnce(leadError(500, undefined, "Ocurrió un error en el servidor."));
    service.getPublicBookingSettings.mockResolvedValue(settings());
    renderWithQuery(<LeadSettingsPage />);
    expect(await screen.findByText("No se pudo cargar la configuración")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Desactivado")).toBeInTheDocument();
  });
});
