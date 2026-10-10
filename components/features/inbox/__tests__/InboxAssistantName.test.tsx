import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const state = vi.hoisted(() => ({ getGeneralSettings: vi.fn() }));
vi.mock("@/lib/services/settings", () => ({
  clinicGeneralSettingsService: { getGeneralSettings: state.getGeneralSettings },
}));
vi.mock("@/lib/auth/token-client", () => ({ getAccessToken: () => "token-de-prueba" }));

import { I18nProvider } from "@/lib/contexts/i18n-context";
import { AssistantNameProvider } from "@/lib/contexts/assistant-name-context";
import type { InboxConversation } from "@/lib/entity/inbox";
import { InboxConversationRow } from "../InboxConversationRow";
import { InboxNeedsHumanBanner } from "../InboxNeedsHumanBanner";

// Solo datos ficticios.
const conversation = {
  id: "conv-1",
  contactPhone: "+50500000000",
  patientId: null,
  patientName: "Paciente de Prueba",
  status: "OPEN",
  handlingMode: "DALIA",
  assignedTo: null,
  unreadCount: 0,
  lastMessageAt: null,
  lastInboundAt: null,
  lastMessagePreview: "Hola",
} as InboxConversation;

function renderInbox(children: ReactNode) {
  return render(
    <I18nProvider>
      <AssistantNameProvider>{children}</AssistantNameProvider>
    </I18nProvider>,
  );
}

const ui = (
  <>
    <InboxConversationRow conversation={conversation} isSelected={false} onClick={() => {}} />
    <InboxNeedsHumanBanner onTakeover={() => {}} />
  </>
);

describe("Nombre de la asistente en la bandeja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("muestra el nombre configurado aunque la API siga enviando DALIA", async () => {
    state.getGeneralSettings.mockResolvedValue({ assistantName: "Aris" });
    renderInbox(ui);

    await waitFor(() => expect(screen.getByText("Aris")).toBeInTheDocument());
    expect(screen.getByText("Aris transfirió esta conversación al equipo.")).toBeInTheDocument();
    expect(screen.queryByText(/Dalia/)).not.toBeInTheDocument();
  });

  it("sigue diciendo «Dalia» contra un backend que aún no envía el campo", async () => {
    state.getGeneralSettings.mockResolvedValue({});
    renderInbox(ui);

    await waitFor(() => expect(state.getGeneralSettings).toHaveBeenCalled());
    expect(screen.getByText("Dalia")).toBeInTheDocument();
    expect(screen.getByText("Dalia transfirió esta conversación al equipo.")).toBeInTheDocument();
  });

  it("sigue diciendo «Dalia» si no se pueden leer los ajustes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.getGeneralSettings.mockRejectedValue(new Error("403"));
    renderInbox(ui);

    await waitFor(() => expect(state.getGeneralSettings).toHaveBeenCalled());
    expect(screen.getByText("Dalia")).toBeInTheDocument();
  });
});
