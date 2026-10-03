import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { billingMockInstance, renderWithQuery, resetBillingMock } from "./billing-test-utils";
import { CashPage } from "../cash/CashPage";

vi.mock("@/lib/services/billing/billing.service", async () => (await import("./billing-test-utils")).serviceModule());
vi.mock("@/lib/utils/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const permissions = vi.hoisted(() => ({ isAdmin: true, permissionsObj: {} as Record<string, number> }));
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ can: () => false, ...permissions }),
}));

async function openSessionWithSale() {
  const mock = resetBillingMock();
  await mock.service.openCashSession({ openingFloat: 500 });
  await mock.service.registerPayment({ patientId: "p1", amount: 300, currency: "NIO", method: "CASH" }, "k1");
  return mock;
}

describe("CashPage — cierre de caja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.isAdmin = true;
    permissions.permissionsObj = {};
  });

  it("muestra la caja abierta con fondo, entradas y esperado", async () => {
    await openSessionWithSale();
    renderWithQuery(<CashPage />);
    expect(await screen.findByText(/Caja abierta desde/)).toBeInTheDocument();
    expect(screen.getAllByText("Esperado").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/800[.,]00/).length).toBeGreaterThan(0);
  });

  it("muestra la diferencia antes de confirmar (en rojo si falta) y cierra con la version", async () => {
    const mock = await openSessionWithSale();
    const close = vi.spyOn(mock.service, "closeCashSession");
    const user = userEvent.setup();
    renderWithQuery(<CashPage />);
    await user.click(await screen.findByRole("button", { name: "Cerrar caja" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Efectivo contado"), { target: { value: "790" } });
    const difference = await within(dialog).findByTestId("cash-difference");
    expect(difference).toHaveTextContent(/Falta .*10[.,]00/);
    expect(difference.className).toMatch(/rose/);

    await user.click(within(dialog).getByRole("button", { name: "Cerrar caja" }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    const [, body] = close.mock.calls[0];
    expect(body).toMatchObject({ countedCash: 790, version: expect.any(Number) });
    expect(await screen.findByText("Caja cerrada")).toBeInTheDocument();
  });

  it("si otro usuario movió la caja (409) muestra el aviso y recarga el esperado", async () => {
    const mock = await openSessionWithSale();
    const user = userEvent.setup();
    renderWithQuery(<CashPage />);
    await user.click(await screen.findByRole("button", { name: "Cerrar caja" }));
    const dialog = await screen.findByRole("dialog");

    // Otro cobro en efectivo mientras se contaba: cambia la versión de la caja.
    await mock.service.registerPayment({ patientId: "p2", amount: 100, currency: "NIO", method: "CASH" }, "k2");

    fireEvent.change(within(dialog).getByLabelText("Efectivo contado"), { target: { value: "800" } });
    await user.click(within(dialog).getByRole("button", { name: "Cerrar caja" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "La caja cambió mientras la cerrabas; recarga y vuelve a contar.",
    );
    // Tras recargar, el esperado incluye el nuevo cobro (900) y el reintento cuadra.
    await waitFor(() => expect(within(dialog).getAllByText(/900[.,]00/).length).toBeGreaterThan(0));
  });

  it("sin permiso de cerrar no muestra el botón", async () => {
    permissions.isAdmin = false;
    permissions.permissionsObj = { billing: 1, billing_cash: 1 };
    await openSessionWithSale();
    renderWithQuery(<CashPage />);
    await screen.findByText(/Caja abierta desde/);
    expect(screen.queryByRole("button", { name: "Cerrar caja" })).not.toBeInTheDocument();
  });

  it("sin caja abierta ofrece 'Abrir caja' y la abre con el fondo", async () => {
    resetBillingMock();
    const user = userEvent.setup();
    renderWithQuery(<CashPage />);
    await user.click(await screen.findByRole("button", { name: "Abrir caja" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Fondo inicial"), { target: { value: "250" } });
    await user.click(within(dialog).getByRole("button", { name: "Abrir caja" }));
    await waitFor(async () => expect(await billingMockInstance().service.getCurrentCashSession()).toMatchObject({ openingFloat: 250 }));
  });
});
