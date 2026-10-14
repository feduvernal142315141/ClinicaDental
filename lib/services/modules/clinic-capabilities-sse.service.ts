import apiInstance from "@/lib/services/apiConfig";

const SESSION_STORAGE_KEY = "clinic-capabilities-sse-session-id";
let activeSessionId: string | null = null;

type TicketResponse = {
  ticketId?: unknown;
};

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getClinicCapabilitiesSessionId(): string {
  if (typeof window === "undefined") return newSessionId();
  if (activeSessionId) return activeSessionId;
  activeSessionId = newSessionId();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, activeSessionId);
  return activeSessionId;
}

export function clearClinicCapabilitiesSessionId(): void {
  activeSessionId = null;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export async function createClinicCapabilitiesSseTicket(sessionId: string): Promise<string> {
  const response = await apiInstance.post<TicketResponse>(
    "/clinic/capabilities/events/ticket",
    { sessionId },
    { headers: { "X-Silent": "true" } },
  );
  if (typeof response.data?.ticketId !== "string" || !response.data.ticketId) {
    throw new Error("El backend no devolvió un ticket SSE de capacidades válido.");
  }
  return response.data.ticketId;
}

export async function disconnectClinicCapabilitiesSession(): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = activeSessionId ?? window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) return;
  await apiInstance.post(
    "/clinic/capabilities/events/disconnect",
    { sessionId },
    { headers: { "X-Silent": "true" } },
  );
}

export function clinicCapabilitiesSseUrl(ticketId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${baseUrl}/clinic/capabilities/events?ticket=${encodeURIComponent(ticketId)}`;
}
