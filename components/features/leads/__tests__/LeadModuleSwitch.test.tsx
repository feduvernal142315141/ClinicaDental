import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { capabilitiesKey } from "@/lib/hooks/billing/billing-query-keys";
import { leadError, makeLead, renderHookWithQuery, renderWithQuery } from "./lead-test-utils";

const capabilities = vi.hoisted(() => ({ modules: ["LEAD_CRM"] as string[] }));
vi.mock("@/lib/services/billing/billing.service", () => ({
  isBillingMockEnabled: false,
  billingService: {
    getCapabilities: vi.fn(async () => ({
      specialty: null,
      plan: null,
      operationalStatus: null,
      modules: [...capabilities.modules],
    })),
  },
}));

const service = vi.hoisted(() => ({ byConversation: vi.fn(), pipeline: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/services/leads/leads.service", () => ({ leadsService: service }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/contexts/auth-context", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/utils/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const permissions = vi.hoisted(() => ({ isAdmin: true, permissionsObj: {} as Record<string, number> }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => permissions.isAdmin, ...permissions }),
}));

import { emitLeadModuleDisabled } from "@/lib/services/leads/leads-errors";
import { useLeadAccess } from "@/lib/hooks/leads";
import { notify } from "@/lib/utils/notify";
import { LeadGate } from "../module/LeadGate";
import { LeadModuleBridge } from "../module/LeadModuleBridge";
import { LeadConversationPanel } from "../inbox/LeadConversationPanel";

describe("interruptor del módulo Adquisición de pacientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilities.modules = ["LEAD_CRM"];
    permissions.isAdmin = true;
    permissions.permissionsObj = {};
  });

  it("con LEAD_CRM y permiso muestra la pantalla", async () => {
    renderWithQuery(
      <LeadGate>
        <p>Contenido de prospectos</p>
      </LeadGate>,
    );
    expect(await screen.findByText("Contenido de prospectos")).toBeInTheDocument();
  });

  it("sin LEAD_CRM muestra 'Tu clínica no tiene habilitado este módulo' (aunque Finanzas esté activo)", async () => {
    capabilities.modules = ["FINANCE"];
    renderWithQuery(
      <LeadGate>
        <p>Contenido de prospectos</p>
      </LeadGate>,
    );
    expect(await screen.findByText("Tu clínica no tiene habilitado este módulo")).toBeInTheDocument();
    expect(screen.queryByText("Contenido de prospectos")).not.toBeInTheDocument();
  });

  it("LEAD_CRM funciona sin FINANCE: los módulos son independientes", async () => {
    capabilities.modules = ["LEAD_CRM"];
    const { result } = renderHookWithQuery(() => useLeadAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ enabled: true, visible: true });
  });

  it("con el módulo pero sin ninguna acción sobre `leads`: oculto", async () => {
    permissions.isAdmin = false;
    permissions.permissionsObj = { patients: 15, leads_manage: 2 };
    const { result } = renderHookWithQuery(() => useLeadAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ enabled: true, visible: false });

    renderWithQuery(
      <LeadGate>
        <p>Contenido de prospectos</p>
      </LeadGate>,
    );
    expect(await screen.findByText("No tienes permiso para esta sección")).toBeInTheDocument();
  });

  it("un 403 MODULE_NOT_ENABLED apaga el módulo, avisa una vez y refresca capacidades", async () => {
    const { client } = renderWithQuery(
      <>
        <LeadModuleBridge />
        <LeadGate>
          <p>Contenido de prospectos</p>
        </LeadGate>
      </>,
    );
    await screen.findByText("Contenido de prospectos");

    capabilities.modules = [];
    act(() => {
      emitLeadModuleDisabled();
      emitLeadModuleDisabled();
    });

    expect(await screen.findByText("Tu clínica no tiene habilitado este módulo")).toBeInTheDocument();
    expect(notify.warning).toHaveBeenCalledTimes(1);
    expect(notify.warning).toHaveBeenCalledWith("Tu clínica no tiene habilitado este módulo");
    await waitFor(() =>
      expect(client.getQueryData<{ modules: string[] }>(capabilitiesKey)?.modules).toEqual([]),
    );
  });
});

describe("panel de prospecto en la bandeja de WhatsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilities.modules = ["LEAD_CRM"];
    permissions.isAdmin = true;
    permissions.permissionsObj = {};
  });

  it("con el módulo apagado no pinta nada ni llama al backend", async () => {
    capabilities.modules = ["FINANCE"];
    const { container } = renderWithQuery(<LeadConversationPanel conversationId="conv-1" hasPatient={false} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(service.byConversation).not.toHaveBeenCalled();
  });

  it("sin permiso sobre `leads` tampoco aparece", async () => {
    permissions.isAdmin = false;
    permissions.permissionsObj = { whatsapp_inbox: 15 };
    const { container } = renderWithQuery(<LeadConversationPanel conversationId="conv-1" hasPatient={false} />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
    expect(service.byConversation).not.toHaveBeenCalled();
  });

  it("con prospecto muestra el resumen y el enlace a la ficha", async () => {
    service.byConversation.mockResolvedValue({ lead: makeLead({ id: "lead-77", conversationId: "conv-1" }) });
    renderWithQuery(<LeadConversationPanel conversationId="conv-1" hasPatient={false} />);
    expect(await screen.findByText("Calificado")).toBeInTheDocument();
    expect(screen.getByText("Implante dental")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver ficha del prospecto/ })).toHaveAttribute("href", "/leads/lead-77");
  });

  it("sin prospecto ni paciente ofrece 'Convertir en prospecto'", async () => {
    service.byConversation.mockResolvedValue({ lead: null });
    renderWithQuery(<LeadConversationPanel conversationId="conv-1" hasPatient={false} />);
    expect(await screen.findByRole("button", { name: /Convertir en prospecto/ })).toBeInTheDocument();
  });

  it("si la conversación ya es de un paciente no muestra el botón", async () => {
    service.byConversation.mockResolvedValue({ lead: null });
    const { container } = renderWithQuery(<LeadConversationPanel conversationId="conv-1" hasPatient />);
    await waitFor(() => expect(service.byConversation).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("si el backend responde módulo apagado el panel desaparece sin romper la bandeja", async () => {
    service.byConversation.mockRejectedValue(leadError(403, "MODULE_NOT_ENABLED"));
    const { container } = renderWithQuery(<LeadConversationPanel conversationId="conv-1" hasPatient={false} />);
    await waitFor(() => expect(service.byConversation).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
