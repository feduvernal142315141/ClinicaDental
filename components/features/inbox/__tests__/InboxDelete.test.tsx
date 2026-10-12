import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const api = vi.hoisted(() => ({
  getInboxConversations: vi.fn(),
  getInboxConversationsSilent: vi.fn(),
  getInboxConversationDetail: vi.fn(),
  getInboxConversationDetailSilent: vi.fn(),
  getInboxMessages: vi.fn(),
  getInboxMessagesSilent: vi.fn(),
  getInboxSummary: vi.fn(),
  getInboxSummarySilent: vi.fn(),
  markConversationRead: vi.fn(),
  takeoverConversation: vi.fn(),
  releaseConversation: vi.fn(),
  resolveConversation: vi.fn(),
  reopenConversation: vi.fn(),
  sendInboxMessage: vi.fn(),
  linkConversationPatient: vi.fn(),
  createInboxSseTicket: vi.fn(),
  deleteConversation: vi.fn(),
  deleteConversations: vi.fn(),
}));
const access = vi.hoisted(() => ({ isAdmin: false, granted: [] as number[] }));
const realtime = vi.hoisted(() => ({
  emit: (() => {}) as (event: { type: string; conversationId?: string }) => void,
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/services/inbox/inbox.service", () => api);
vi.mock("@/lib/utils/notify", () => ({ notify: toast }));
vi.mock("@/lib/services/settings", () => ({
  clinicGeneralSettingsService: { getGeneralSettings: vi.fn().mockResolvedValue({}) },
}));
vi.mock("@/lib/auth/token-client", () => ({ getAccessToken: () => "token-de-prueba" }));
vi.mock("@/lib/contexts/auth-context", () => ({ useAuth: () => ({ user: { id: "user-me" } }) }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({
    isAdmin: access.isAdmin,
    can: (_module: string, action: number) => access.granted.includes(action),
  }),
}));
vi.mock("@/components/ui/hooks/use-mobile", () => ({ useIsMobile: () => false }));
// El tiempo real se sustituye por un emisor manual: el test decide qué evento llega.
vi.mock("@/lib/hooks/inbox/use-inbox-sse", () => ({
  useInboxSSE: ({ onEvent }: { onEvent: typeof realtime.emit }) => {
    realtime.emit = onEvent;
    return "connected";
  },
}));

import { I18nProvider } from "@/lib/contexts/i18n-context";
import { AssistantNameProvider } from "@/lib/contexts/assistant-name-context";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { INBOX_DELETE_MAX, type InboxConversation } from "@/lib/entity/inbox";
import { InboxPage } from "../InboxPage";
import { InboxConversationList } from "../InboxConversationList";
import { InboxDeleteDialog } from "../InboxDeleteDialog";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});
afterAll(() => vi.unstubAllGlobals());

// Solo datos ficticios.
const conversation = (id: string, overrides: Partial<InboxConversation> = {}): InboxConversation => ({
  id,
  clinicId: "clinic-1",
  whatsappAccountId: "account-1",
  contactPhone: `+5050000${id}`,
  patientId: null,
  patientName: `Paciente ${id}`,
  status: "OPEN",
  handlingMode: "DALIA",
  assignedTo: null,
  unreadCount: 0,
  lastMessageAt: null,
  lastInboundAt: null,
  lastMessagePreview: "Hola",
  ...overrides,
});

const wrap = (children: ReactNode) => (
  <I18nProvider>
    <AssistantNameProvider>{children}</AssistantNameProvider>
  </I18nProvider>
);

/** Servidor en memoria: lo que la bandeja devuelve en cada lectura. */
let server: InboxConversation[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  access.isAdmin = false;
  access.granted = [PermissionAction.DELETE];
  server = [conversation("A"), conversation("B"), conversation("C")];
  const page = async () => ({ rows: [...server], total: server.length, page: 0, pageSize: 20 });
  api.getInboxConversations.mockImplementation(page);
  api.getInboxConversationsSilent.mockImplementation(page);
  const detail = async (id: string) => {
    const found = server.find((c) => c.id === id);
    if (!found) throw Object.assign(new Error("No encontrada"), { status: 404 });
    return {
      ...found,
      patientPhone: null,
      patientEmail: null,
      nextAppointmentId: null,
      nextAppointmentDate: null,
      nextAppointmentTime: null,
      nextAppointmentDoctorName: null,
      windowOpen: true,
      windowExpiresAt: null,
    };
  };
  api.getInboxConversationDetail.mockImplementation(detail);
  api.getInboxConversationDetailSilent.mockImplementation(detail);
  api.getInboxMessages.mockResolvedValue([]);
  api.getInboxMessagesSilent.mockResolvedValue([]);
  const summary = { totalUnread: 0, needsHuman: 0, openHuman: 0, openDalia: 0 };
  api.getInboxSummary.mockResolvedValue(summary);
  api.getInboxSummarySilent.mockResolvedValue(summary);
});

const row = (name: string) => screen.queryByRole("button", { name: `Conversación con ${name}` });
/** Nombre que muestra la cabecera del chat abierto. */
const openChatName = () =>
  within(document.querySelector(".h-\\[60px\\]") as HTMLElement).getByText(/^Paciente /).textContent;

async function renderPage() {
  render(wrap(<InboxPage />));
  await waitFor(() => expect(row("Paciente A")).toBeInTheDocument());
  // En escritorio se abre sola la primera conversación.
  await waitFor(() => expect(openChatName()).toBe("Paciente A"));
}

describe("Eliminar conversaciones en la Bandeja", () => {
  it("no ofrece eliminar a quien no tiene el permiso", async () => {
    access.granted = [PermissionAction.EDIT, PermissionAction.CREATE, PermissionAction.BLOCK];
    await renderPage();

    expect(screen.queryByRole("button", { name: "Seleccionar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Opciones de la conversación/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Más opciones" })).not.toBeInTheDocument();
  });

  it("elimina una desde el menú de su fila, tras confirmar, y la quita de la lista", async () => {
    const user = userEvent.setup();
    api.deleteConversation.mockImplementation(async (id: string) => {
      server = server.filter((c) => c.id !== id);
      return { deleted: 1, deletedIds: [id] };
    });
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Opciones de la conversación con Paciente B" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar conversación" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Se eliminará la conversación con Paciente B.")).toBeInTheDocument();
    expect(api.deleteConversation).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Eliminar conversación" }));

    await waitFor(() => expect(row("Paciente B")).not.toBeInTheDocument());
    expect(api.deleteConversation).toHaveBeenCalledWith("B");
    expect(toast.success).toHaveBeenCalledWith("Conversación eliminada");
    // El chat abierto era otro: sigue abierto.
    expect(openChatName()).toBe("Paciente A");
  });

  it("cancelar no elimina nada", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Opciones de la conversación con Paciente B" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar conversación" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(api.deleteConversation).not.toHaveBeenCalled();
    expect(row("Paciente B")).toBeInTheDocument();
  });

  it("elimina el chat abierto desde el menú de su cabecera y lo cierra", async () => {
    const user = userEvent.setup();
    api.deleteConversation.mockImplementation(async (id: string) => {
      server = server.filter((c) => c.id !== id);
      return { deleted: 1, deletedIds: [id] };
    });
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Más opciones" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar conversación" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Eliminar conversación" }),
    );

    await waitFor(() => expect(row("Paciente A")).not.toBeInTheDocument());
    // Se cerró el eliminado; la bandeja pasa a la siguiente conversación.
    await waitFor(() => expect(openChatName()).toBe("Paciente B"));
    // Fue este usuario: no se le dice que «otra persona» la eliminó.
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("elimina varias seleccionadas y, si el resultado es parcial, dice cuántas salieron", async () => {
    const user = userEvent.setup();
    // El servidor solo elimina C: B ya la había quitado otra persona.
    api.deleteConversations.mockImplementation(async () => {
      server = server.filter((c) => c.id !== "C");
      return { deleted: 1, deletedIds: ["C"] };
    });
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Seleccionar" }));
    expect(screen.getByText("0 seleccionadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Seleccionar la conversación con Paciente B" }));
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar la conversación con Paciente C" }));
    expect(screen.getByText("2 seleccionadas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Se eliminarán 2 conversaciones.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Eliminar 2 conversaciones" }));

    await waitFor(() => expect(api.deleteConversations).toHaveBeenCalledWith(["B", "C"]));
    await waitFor(() => expect(row("Paciente C")).not.toBeInTheDocument());
    expect(row("Paciente B")).toBeInTheDocument();
    expect(toast.warning).toHaveBeenCalledWith(
      "Se eliminaron 1 de 2 conversaciones",
      expect.objectContaining({ description: "Las demás ya no estaban en la bandeja." }),
    );
    expect(toast.success).not.toHaveBeenCalled();
    // Termina el modo selección.
    expect(screen.getByRole("button", { name: "Seleccionar" })).toBeInTheDocument();
  });

  it("ante un 404 refresca la lista en vez de mostrar éxito", async () => {
    const user = userEvent.setup();
    api.deleteConversation.mockImplementation(async () => {
      server = server.filter((c) => c.id !== "B");
      throw Object.assign(new Error("No encontrada"), { status: 404 });
    });
    await renderPage();
    const reads = api.getInboxConversationsSilent.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Opciones de la conversación con Paciente B" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar conversación" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Eliminar conversación" }),
    );

    await waitFor(() => expect(row("Paciente B")).not.toBeInTheDocument());
    expect(api.getInboxConversationsSilent.mock.calls.length).toBeGreaterThan(reads);
    expect(toast.info).toHaveBeenCalledWith("La conversación ya no existía", expect.anything());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("cuando otra persona elimina el chat abierto, lo cierra y avisa", async () => {
    await renderPage();

    server = server.filter((c) => c.id !== "A");
    act(() => realtime.emit({ type: "conversation_deleted", conversationId: "A" }));

    await waitFor(() => expect(row("Paciente A")).not.toBeInTheDocument());
    expect(toast.info).toHaveBeenCalledWith("Otra persona eliminó esta conversación");
    await waitFor(() => expect(openChatName()).toBe("Paciente B"));
  });

  it("cuando otra persona elimina una conversación que no está abierta, solo desaparece", async () => {
    await renderPage();

    server = server.filter((c) => c.id !== "C");
    act(() => realtime.emit({ type: "conversation_deleted", conversationId: "C" }));

    await waitFor(() => expect(row("Paciente C")).not.toBeInTheDocument());
    expect(toast.info).not.toHaveBeenCalled();
    expect(openChatName()).toBe("Paciente A");
  });

  it("sin evento de tiempo real, cierra el chat abierto cuando su detalle responde 404", async () => {
    await renderPage();

    server = server.filter((c) => c.id !== "A");
    // Lo que haría el siguiente ciclo de polling sobre el chat abierto.
    act(() => realtime.emit({ type: "conversation_update", conversationId: "A" }));

    await waitFor(() => expect(row("Paciente A")).not.toBeInTheDocument());
    expect(toast.info).toHaveBeenCalledWith("Esta conversación ya no está en la bandeja");
    // La siguiente conversación se abre y NO se toma por eliminada.
    await waitFor(() => expect(openChatName()).toBe("Paciente B"));
    expect(row("Paciente B")).toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledTimes(1);
  });
});

describe("Selección en la lista", () => {
  const many = Array.from({ length: INBOX_DELETE_MAX + 1 }, (_, i) => conversation(String(i)));
  const baseProps = {
    loading: false,
    selectedId: null,
    onSelect: vi.fn(),
    query: "",
    onQueryChange: vi.fn(),
    activeFilter: "all" as const,
    onFilterChange: vi.fn(),
  };

  it("avisa al llegar al máximo y no deja marcar más, pero sí desmarcar", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      wrap(
        <InboxConversationList
          {...baseProps}
          conversations={many}
          deletion={{
            selecting: true,
            selectedIds: new Set(many.slice(0, INBOX_DELETE_MAX).map((c) => c.id)),
            onStartSelecting: vi.fn(),
            onCancelSelecting: vi.fn(),
            onToggle,
            onDeleteSelected: vi.fn(),
            onDeleteOne: vi.fn(),
          }}
        />,
      ),
    );

    expect(screen.getByText("100 seleccionadas")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Puedes seleccionar hasta 100 conversaciones a la vez.");

    const extra = screen.getByRole("checkbox", { name: "Seleccionar la conversación con Paciente 100" });
    expect(extra).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Conversación con Paciente 100" }));
    expect(onToggle).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: "Seleccionar la conversación con Paciente 0" }));
    expect(onToggle).toHaveBeenCalledWith("0");
  });

  it("en modo selección, pulsar la fila la marca en vez de abrir el chat", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onSelect = vi.fn();
    render(
      wrap(
        <InboxConversationList
          {...baseProps}
          onSelect={onSelect}
          conversations={many.slice(0, 2)}
          deletion={{
            selecting: true,
            selectedIds: new Set(),
            onStartSelecting: vi.fn(),
            onCancelSelecting: vi.fn(),
            onToggle,
            onDeleteSelected: vi.fn(),
            onDeleteOne: vi.fn(),
          }}
        />,
      ),
    );

    await user.click(screen.getByRole("button", { name: "Conversación con Paciente 1" }));

    expect(onToggle).toHaveBeenCalledWith("1");
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("Confirmación de eliminar", () => {
  const renderDialog = (conversations: InboxConversation[]) =>
    render(
      wrap(
        <InboxDeleteDialog
          conversations={conversations}
          currentUserId="user-me"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      ),
    );

  it("explica qué significa eliminar y recuerda que Resolver no elimina nada", () => {
    renderDialog([conversation("A")]);
    const dialog = screen.getByRole("alertdialog");

    expect(dialog).toHaveTextContent("Desaparece de la bandeja de todos los usuarios de la clínica y no se puede deshacer");
    expect(dialog).toHaveTextContent("No se borra nada en el WhatsApp del paciente.");
    expect(dialog).toHaveTextContent("se abre una conversación nueva, atendida por Dalia (la asistente virtual) y sin el historial anterior");
    expect(dialog).toHaveTextContent("usa «Resolver»: no elimina nada");
    // Solo la asistente la atendía: no hay nada que destacar.
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("destaca lo que el equipo está atendiendo: modo Humano, asignadas a otra persona y las que requieren atención", () => {
    renderDialog([
      conversation("A"),
      conversation("B", { handlingMode: "HUMAN", assignedTo: "user-me" }),
      conversation("C", { handlingMode: "HUMAN", assignedTo: "user-other" }),
      conversation("D", { status: "NEEDS_HUMAN" }),
    ]);

    const warning = within(screen.getByRole("alertdialog")).getByRole("alert");
    expect(warning).toHaveTextContent("En modo Humano: 2");
    expect(warning).toHaveTextContent("Asignadas a otra persona: 1");
    expect(warning).toHaveTextContent("Requieren atención: 1");
    expect(warning).toHaveTextContent("le responderá Dalia, no la persona que lo atendía");
  });

  it("deja el foco en Cancelar, la opción segura", () => {
    renderDialog([conversation("A")]);

    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });
});
