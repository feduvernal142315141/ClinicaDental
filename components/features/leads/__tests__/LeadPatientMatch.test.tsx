import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { leadError, makeLead, renderWithQuery } from "./lead-test-utils";

const service = vi.hoisted(() => ({
  get: vi.fn(),
  activity: vi.fn(),
  resolvePatientMatch: vi.fn(),
}));
vi.mock("@/lib/services/leads/leads.service", () => ({ leadsService: service }));

vi.mock("@/lib/hooks/leads/use-lead-catalogs", () => ({
  useLeadServiceOptions: () => ({ data: [] }),
  useLeadUserOptions: () => ({ data: [] }),
  useLeadProviderOptions: () => ({ data: [] }),
  useLeadDoctorSchedule: () => ({ data: null }),
  useLeadAvailability: () => ({ data: [], isFetching: false, refetch: vi.fn() }),
  optionName: () => undefined,
}));
vi.mock("@/lib/hooks/settings/use-clinic-general-settings", () => ({
  useClinicGeneralSettings: () => ({ rawSchedule: null }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/contexts/i18n-context", () => ({ useI18n: () => ({ t: (key: string) => key, language: "es" }) }));
// La confirmación se acepta de inmediato: lo que se prueba es qué se envía.
vi.mock("@/lib/contexts/alert-context", () => ({
  useAlert: () => ({ showConfirm: ({ onConfirm }: { onConfirm?: () => void }) => onConfirm?.() }),
}));
vi.mock("@/lib/utils/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const permissions = vi.hoisted(() => ({ isAdmin: true, permissionsObj: {} as Record<string, number> }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => permissions.isAdmin, ...permissions }),
}));

import { resolveLeadPermissions } from "@/lib/hooks/leads";
import { notify } from "@/lib/utils/notify";
import { resolveLeadDrop } from "../board/LeadBoard";
import { LeadDetailPage } from "../detail/LeadDetailPage";

const CANDIDATE = {
  patientId: "patient-1",
  name: "Paciente Existente",
  phone: "8333-0001",
  email: null,
  matchedBy: "PHONE" as const,
};

const possible = makeLead({ patientMatchStatus: "POSSIBLE" });

function mockDetail(lead = possible, patientMatches = [CANDIDATE]) {
  service.get.mockResolvedValue({ lead, followUps: [], patientMatches });
  service.activity.mockResolvedValue({ entities: [], pagination: { page: 0, pageSize: 10, total: 0 } });
}

describe("coincidencia con un paciente existente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.isAdmin = true;
    permissions.permissionsObj = {};
  });

  it("muestra el aviso con los candidatos y por qué coinciden", async () => {
    mockDetail();
    renderWithQuery(<LeadDetailPage leadId="lead-1" />);
    expect(await screen.findByText("Paciente Existente")).toBeInTheDocument();
    expect(screen.getAllByText("Podría ser un paciente existente").length).toBeGreaterThan(0);
    expect(screen.getByText("Coincide por: Mismo teléfono")).toBeInTheDocument();
    expect(screen.getByText(/8333-0001/)).toBeInTheDocument();
  });

  it("mientras esté en POSSIBLE, 'Reservar cita' está deshabilitado y se explica por qué", async () => {
    mockDetail();
    renderWithQuery(<LeadDetailPage leadId="lead-1" />);
    const book = await screen.findByRole("button", { name: "Reservar cita" });
    expect(book).toBeDisabled();
    expect(book).toHaveAttribute("title", "Primero resuelve si es un paciente existente");
    expect(screen.getByText(/no se puede reservar ni convertir como paciente nuevo/)).toBeInTheDocument();
    // La alternativa: reservar para el paciente existente.
    expect(screen.getByRole("button", { name: "Reservar cita para este paciente" })).toBeEnabled();
  });

  it("sin coincidencia pendiente 'Reservar cita' está disponible", async () => {
    mockDetail(makeLead({ patientMatchStatus: "NONE" }), []);
    renderWithQuery(<LeadDetailPage leadId="lead-1" />);
    expect(await screen.findByRole("button", { name: "Reservar cita" })).toBeEnabled();
    expect(screen.queryByText("Podría ser un paciente existente")).not.toBeInTheDocument();
  });

  it("'Es este paciente' envía CONFIRM con el patientId elegido", async () => {
    mockDetail();
    service.resolvePatientMatch.mockResolvedValue(makeLead({ stage: "LOST", outcome: "EXISTING_PATIENT" }));
    renderWithQuery(<LeadDetailPage leadId="lead-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Es este paciente" }));
    await waitFor(() =>
      expect(service.resolvePatientMatch).toHaveBeenCalledWith("lead-1", { decision: "CONFIRM", patientId: "patient-1" }),
    );
  });

  it("'Es otra persona' envía DISMISS sin patientId", async () => {
    mockDetail();
    service.resolvePatientMatch.mockResolvedValue(makeLead({ patientMatchStatus: "DISMISSED" }));
    renderWithQuery(<LeadDetailPage leadId="lead-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Es otra persona" }));
    await waitFor(() => expect(service.resolvePatientMatch).toHaveBeenCalledWith("lead-1", { decision: "DISMISS" }));
  });

  it("sin `leads_manage` se ve el aviso pero no se puede decidir", async () => {
    permissions.isAdmin = false;
    permissions.permissionsObj = { leads: 3 };
    mockDetail();
    renderWithQuery(<LeadDetailPage leadId="lead-1" />);
    expect(await screen.findByText("Paciente Existente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Es este paciente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Es otra persona" })).not.toBeInTheDocument();
    expect(screen.getByText(/Pide a alguien con permiso de gestión/)).toBeInTheDocument();
  });

  it("un prospecto cerrado como EXISTING_PATIENT se muestra 'Ya era paciente', no 'Perdido'", async () => {
    mockDetail(
      makeLead({ stage: "LOST", outcome: "EXISTING_PATIENT", lostReason: "EXISTING_PATIENT", matchedPatientId: "patient-1", patientMatchStatus: "CONFIRMED" }),
      [],
    );
    renderWithQuery(<LeadDetailPage leadId="lead-1" />);
    expect(await screen.findByText("Ya era paciente")).toBeInTheDocument();
    expect(screen.queryByText("Perdido")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver paciente" })).toHaveAttribute("href", "/patients/patient-1");
    expect(screen.getByRole("button", { name: "Reabrir" })).toBeInTheDocument();
  });

  it("un prospecto inexistente o de otra clínica (404) lleva de vuelta a la lista", async () => {
    service.get.mockRejectedValue(leadError(404, "LEAD_NOT_FOUND", "El prospecto no existe."));
    renderWithQuery(<LeadDetailPage leadId="lead-x" />);
    expect(await screen.findByText("El prospecto no existe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a la lista" })).toHaveAttribute("href", "/leads");
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith("El prospecto no existe"));
  });
});

describe("soltar una tarjeta en el tablero", () => {
  const all = resolveLeadPermissions({}, true);
  const editor = resolveLeadPermissions({ leads: 3 }, false);
  const viewer = resolveLeadPermissions({ leads: 4 }, false);
  const lead = makeLead({ stage: "NEW" });

  it("entre Nuevo, Contactado y Calificado cambia la etapa", () => {
    expect(resolveLeadDrop(lead, "CONTACTED", all)).toEqual({ kind: "stage", stage: "CONTACTED" });
    expect(resolveLeadDrop(lead, "QUALIFIED", editor)).toEqual({ kind: "stage", stage: "QUALIFIED" });
    expect(resolveLeadDrop(lead, "NEW", all)).toEqual({ kind: "none" });
  });

  it("'Convertido' abre la reserva y 'Cerrado' el cierre con motivo: nunca usan /stage", () => {
    expect(resolveLeadDrop(lead, "CONVERTED", all)).toEqual({ kind: "book" });
    expect(resolveLeadDrop(lead, "LOST", all)).toEqual({ kind: "lose" });
  });

  it("respeta los permisos", () => {
    expect(resolveLeadDrop(lead, "LOST", editor).kind).toBe("blocked");
    expect(resolveLeadDrop(lead, "CONTACTED", viewer).kind).toBe("blocked");
    expect(resolveLeadDrop(lead, "CONVERTED", viewer).kind).toBe("blocked");
  });

  it("con coincidencia sin resolver no se puede soltar en 'Convertido'", () => {
    expect(resolveLeadDrop(makeLead({ stage: "NEW", patientMatchStatus: "POSSIBLE" }), "CONVERTED", all).kind).toBe("blocked");
  });

  it("un prospecto cerrado o convertido no se mueve", () => {
    expect(resolveLeadDrop(makeLead({ stage: "LOST", outcome: "LOST" }), "NEW", all).kind).toBe("blocked");
    expect(resolveLeadDrop(makeLead({ stage: "CONVERTED", outcome: "CONVERTED" }), "NEW", all).kind).toBe("blocked");
  });
});
