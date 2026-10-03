import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { capabilitiesKey } from "@/lib/hooks/billing/billing-query-keys";
import { FINANCE_MODULE_DISABLED_MESSAGE } from "@/lib/services/billing/billing-errors";
import type { ClinicCapabilities } from "@/lib/entity/billing";
import { billingMockInstance, renderWithQuery, resetBillingMock } from "./billing-test-utils";
import { FinanceGate } from "../module/FinanceGate";
import { FinanceModuleBridge } from "../module/FinanceModuleBridge";

vi.mock("@/lib/services/billing/billing.service", async () => (await import("./billing-test-utils")).serviceModule());

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/contexts/auth-context", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

const permissions = vi.hoisted(() => ({ isAdmin: true, permissionsObj: {} as Record<string, number> }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => false, ...permissions }),
}));

describe("interruptor del módulo de Finanzas en la UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.isAdmin = true;
    permissions.permissionsObj = {};
  });

  it("con FINANCE activo muestra la pantalla", async () => {
    resetBillingMock();
    renderWithQuery(
      <FinanceGate>
        <p>Contenido de Finanzas</p>
      </FinanceGate>,
    );
    expect(await screen.findByText("Contenido de Finanzas")).toBeInTheDocument();
  });

  it("sin FINANCE muestra 'Módulo no disponible' con el texto del brief", async () => {
    resetBillingMock().controls.setFinanceEnabled(false);
    renderWithQuery(
      <FinanceGate>
        <p>Contenido de Finanzas</p>
      </FinanceGate>,
    );
    expect(await screen.findByText("Módulo no disponible")).toBeInTheDocument();
    expect(
      screen.getByText("Finanzas no está habilitado para esta clínica. Contacta a KodeWave para activarlo."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Contenido de Finanzas")).not.toBeInTheDocument();
  });

  it("con el módulo activo pero sin permiso `billing` muestra 'No tienes permiso'", async () => {
    resetBillingMock();
    permissions.isAdmin = false;
    permissions.permissionsObj = { patients: 15 };
    renderWithQuery(
      <FinanceGate>
        <p>Contenido de Finanzas</p>
      </FinanceGate>,
    );
    expect(await screen.findByText("No tienes permiso para esta acción")).toBeInTheDocument();
  });

  it("un 403 de módulo apagado marca el módulo como apagado y redirige, sin cerrar sesión", async () => {
    resetBillingMock();
    const { client } = renderWithQuery(
      <>
        <FinanceModuleBridge />
        <FinanceGate>
          <p>Contenido de Finanzas</p>
        </FinanceGate>
      </>,
    );
    await screen.findByText("Contenido de Finanzas");

    // KodeWave apaga el módulo: la siguiente llamada a /billing responde el 403 exacto.
    billingMockInstance().controls.setFinanceEnabled(false);
    await act(async () => {
      await expect(billingMockInstance().service.getInvoices()).rejects.toMatchObject({
        message: FINANCE_MODULE_DISABLED_MESSAGE,
      });
    });

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/billing"));
    const capabilities = client.getQueryData<ClinicCapabilities>(capabilitiesKey);
    expect(capabilities?.modules).not.toContain("FINANCE");
    expect(await screen.findByText("Módulo no disponible")).toBeInTheDocument();
  });

  it("al reactivarlo, refrescar capabilities vuelve a mostrar Finanzas sin iniciar sesión", async () => {
    resetBillingMock().controls.setFinanceEnabled(false);
    const { client } = renderWithQuery(
      <FinanceGate>
        <p>Contenido de Finanzas</p>
      </FinanceGate>,
    );
    await screen.findByText("Módulo no disponible");
    billingMockInstance().controls.setFinanceEnabled(true);
    await act(async () => {
      await client.invalidateQueries({ queryKey: capabilitiesKey });
    });
    expect(await screen.findByText("Contenido de Finanzas")).toBeInTheDocument();
  });
});
