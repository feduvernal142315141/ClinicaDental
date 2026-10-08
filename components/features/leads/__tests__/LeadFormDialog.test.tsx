import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { leadError, makeLead, renderWithQuery } from "./lead-test-utils";

const service = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), matches: vi.fn() }));
vi.mock("@/lib/services/leads/leads.service", () => ({ leadsService: service }));

vi.mock("@/lib/hooks/leads/use-lead-catalogs", () => ({
  useLeadServiceOptions: () => ({ data: [] }),
  useLeadUserOptions: () => ({ data: [] }),
  optionName: () => undefined,
}));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => true, isAdmin: true, permissionsObj: {} }),
}));
vi.mock("@/lib/utils/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { LeadFormDialog } from "../dialogs/LeadFormDialog";

const NO_MATCHES = { openLeads: [], patients: [] };

function type(label: string, value: string) {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

describe("alta manual de un prospecto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.matches.mockResolvedValue(NO_MATCHES);
  });

  it("no guarda sin nombre, teléfono ni correo", async () => {
    renderWithQuery(<LeadFormDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Crear prospecto" }));
    expect(await screen.findByText("Indica al menos el nombre, el teléfono o el correo.")).toBeInTheDocument();
    expect(service.create).not.toHaveBeenCalled();
  });

  it("al salir del teléfono avisa si ya existe un prospecto abierto o un paciente", async () => {
    service.matches.mockResolvedValue({
      openLeads: [makeLead({ id: "lead-existing", fullName: "Carlos Existente" })],
      patients: [{ patientId: "patient-1", name: "Paciente Existente", phone: "8888-1234", email: null, matchedBy: "PHONE" }],
    });
    renderWithQuery(<LeadFormDialog open onOpenChange={vi.fn()} />);
    type("Teléfono", "8888-1234");

    expect(await screen.findByText("Ya existe alguien con ese dato")).toBeInTheDocument();
    expect(service.matches).toHaveBeenCalledWith({ phone: "8888-1234", email: undefined });
    expect(screen.getByRole("link", { name: "Abrir el existente" })).toHaveAttribute("href", "/leads/lead-existing");
    expect(screen.getByRole("link", { name: "Ver paciente" })).toHaveAttribute("href", "/patients/patient-1");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("duplicado: 409 LEAD_DUPLICATE_OPEN → busca el existente y ofrece abrirlo o crear de todos modos", async () => {
    const onOpenChange = vi.fn();
    const onCreated = vi.fn();
    service.create.mockRejectedValueOnce(leadError(409, "LEAD_DUPLICATE_OPEN", "Ya existe un prospecto abierto."));
    renderWithQuery(<LeadFormDialog open onOpenChange={onOpenChange} onCreated={onCreated} />);
    type("Nombre", "Ana Prueba");
    type("Teléfono", "8888-0000");
    await waitFor(() => expect(service.matches).toHaveBeenCalled());

    // El 409 no trae el id: se consulta /leads/matches para poder abrir el existente.
    service.matches.mockResolvedValue({ openLeads: [makeLead({ id: "lead-dup", fullName: "Ana Duplicada" })], patients: [] });
    fireEvent.click(screen.getByRole("button", { name: "Crear prospecto" }));

    expect(await screen.findByText("Ya hay un prospecto abierto con ese teléfono o correo")).toBeInTheDocument();
    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create.mock.calls[0][0]).not.toHaveProperty("allowDuplicate");
    expect(screen.getByRole("link", { name: "Abrir el existente" })).toHaveAttribute("href", "/leads/lead-dup");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    const created = makeLead({ id: "lead-new", fullName: "Ana Prueba" });
    service.create.mockResolvedValueOnce(created);
    fireEvent.click(screen.getByRole("button", { name: "Crear de todos modos" }));

    await waitFor(() => expect(service.create).toHaveBeenCalledTimes(2));
    expect(service.create.mock.calls[1][0]).toMatchObject({
      fullName: "Ana Prueba",
      phone: "8888-0000",
      allowDuplicate: true,
    });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("un LEAD_INVALID muestra el mensaje del backend junto al formulario", async () => {
    service.create.mockRejectedValueOnce(leadError(400, "LEAD_INVALID", "El teléfono no es válido."));
    renderWithQuery(<LeadFormDialog open onOpenChange={vi.fn()} />);
    type("Nombre", "Ana Prueba");
    fireEvent.click(screen.getByRole("button", { name: "Crear prospecto" }));
    expect(await screen.findByText("El teléfono no es válido.")).toBeInTheDocument();
  });
});

describe("edición de un prospecto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.matches.mockResolvedValue(NO_MATCHES);
  });

  it("envía la version cargada y solo lo que cambió", async () => {
    const lead = makeLead({ version: 3 });
    service.update.mockResolvedValueOnce({ ...lead, fullName: "Carlos Editado", version: 4 });
    const onOpenChange = vi.fn();
    renderWithQuery(<LeadFormDialog open onOpenChange={onOpenChange} lead={lead} />);
    type("Nombre", "Carlos Editado");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(service.update).toHaveBeenCalledWith("lead-1", { version: 3, fullName: "Carlos Editado" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("conflicto de versión: avisa, conserva lo escrito y reintenta con la version nueva", async () => {
    const lead = makeLead({ version: 3 });
    service.update.mockRejectedValueOnce(leadError(409, "LEAD_VERSION_CONFLICT", "Versión desactualizada."));
    const onOpenChange = vi.fn();
    const view = renderWithQuery(<LeadFormDialog open onOpenChange={onOpenChange} lead={lead} />);
    type("Nombre", "Carlos Editado");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Otra persona modificó este prospecto")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Carlos Editado");

    // La ficha se recarga: llega la versión 4 con un teléfono que cambió la otra persona.
    const reloaded = makeLead({ version: 4, phone: "7777-0000" });
    view.rerender(
      <QueryClientProvider client={view.client}>
        <LeadFormDialog open onOpenChange={onOpenChange} lead={reloaded} />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText("Nombre")).toHaveValue("Carlos Editado");

    service.update.mockResolvedValueOnce({ ...reloaded, fullName: "Carlos Editado", version: 5 });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(service.update).toHaveBeenCalledTimes(2));
    expect(service.update.mock.calls[1][1]).toMatchObject({ version: 4, fullName: "Carlos Editado" });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

