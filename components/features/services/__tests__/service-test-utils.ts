import type { Service, ServiceListItem } from "@/lib/entity/services";
import { es } from "@/lib/i18n/locales/es";

/** `t` del panel en español, sin montar el proveedor de traducciones. */
export const t = (key: string) => (es as Record<string, string>)[key] ?? key;

/** Servicio ficticio del catálogo (solo datos de prueba). */
export function makeService(overrides: Partial<Service> = {}): Service & ServiceListItem {
  return {
    id: "service-1",
    code: "BLQ-01",
    name: "Blanqueamiento",
    type: "TREATMENT",
    cost: 250,
    duration: 60,
    odontogramEnabled: false,
    odontogramSymbolMode: "NONE",
    assistantVisible: false,
    assistantDescription: null,
    active: true,
    createAt: "2026-09-01T12:00:00Z",
    ...overrides,
  };
}

/** Error tal como lo lanza `handleServiceError`: mensaje del backend + status. */
export function serviceError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

/** jsdom no trae ResizeObserver y los interruptores de Radix lo usan. */
export class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
