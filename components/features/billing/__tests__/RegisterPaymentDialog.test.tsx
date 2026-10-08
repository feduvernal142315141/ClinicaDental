import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BillingApiError } from "@/lib/services/billing/billing-errors";
import { billingMockInstance, renderWithQuery, resetBillingMock } from "./billing-test-utils";
import { RegisterPaymentDialog } from "../payments/RegisterPaymentDialog";

vi.mock("@/lib/services/billing/billing.service", async () => (await import("./billing-test-utils")).serviceModule());
vi.mock("@/lib/utils/notify", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const PATIENT = "patient-a";

async function setup() {
  const mock = resetBillingMock();
  const invoice = await mock.service.createInvoice({
    patientId: PATIENT,
    items: [{ description: "Endodoncia", quantity: 1, unitPrice: 1000 }],
  });
  const onOpenChange = vi.fn();
  const user = userEvent.setup();
  renderWithQuery(
    <RegisterPaymentDialog
      open
      onOpenChange={onOpenChange}
      patientId={PATIENT}
      invoices={[invoice]}
      invoiceId={invoice.id}
      creditBalance={0}
    />,
  );
  // La configuración (moneda base) llega del servicio: espera a que el formulario esté listo.
  await waitFor(() => expect(screen.getByRole("button", { name: "Cobrar" })).toBeEnabled());
  return { mock, invoice, onOpenChange, user };
}

describe("RegisterPaymentDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("propone el saldo del recibo como monto y registra el pago", async () => {
    const { mock, invoice, onOpenChange, user } = await setup();
    const amount = screen.getByLabelText("Monto") as HTMLInputElement;
    expect(amount.value).toBe("1000");

    // jsdom no vacía un <input type="number"> con user.clear: se fija el valor directamente.
    fireEvent.change(amount, { target: { value: "400" } });
    await user.click(screen.getByRole("button", { name: "Cobrar" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(await mock.service.getInvoice(invoice.id)).toMatchObject({ status: "PARTIALLY_PAID", balance: 600 });
  });

  it("'Pagar saldo' rellena el saldo pendiente", async () => {
    const { user } = await setup();
    const amount = screen.getByLabelText("Monto") as HTMLInputElement;
    fireEvent.change(amount, { target: { value: "5" } });
    expect(amount.value).toBe("5");
    await user.click(screen.getByRole("button", { name: "Pagar saldo" }));
    expect(amount.value).toBe("1000");
  });

  it("valida al salir del campo con el mensaje del backend", async () => {
    await setup();
    const amount = screen.getByLabelText("Monto");
    fireEvent.change(amount, { target: { value: "10.555" } });
    fireEvent.blur(amount);
    expect(await screen.findByText("El monto admite como máximo 2 decimales.")).toBeInTheDocument();
  });

  it("tras un fallo de red permite 'Reintentar' con la MISMA Idempotency-Key", async () => {
    const { mock, user } = await setup();
    const register = vi.spyOn(mock.service, "registerPayment");
    register.mockRejectedValueOnce(new BillingApiError("network", "No se pudo conectar con el servidor."));

    await user.click(screen.getByRole("button", { name: "Cobrar" }));
    const retry = await screen.findByRole("button", { name: "Reintentar" });
    expect(screen.getByRole("alert")).toHaveTextContent("no se duplicará el cobro");

    await user.click(retry);
    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
    const [firstKey, secondKey] = register.mock.calls.map((call) => call[1]);
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBe(firstKey);
  });

  it("deshabilita 'Cobrar' mientras el pago está en curso", async () => {
    const { mock, user } = await setup();
    let release: () => void = () => {};
    vi.spyOn(mock.service, "registerPayment").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({ payment: {} as never, replayed: false });
        }),
    );
    await user.click(screen.getByRole("button", { name: "Cobrar" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Cobrar/ })).toBeDisabled());
    release();
  });

  it("muestra el 409 del backend dentro del modal", async () => {
    const { user } = await setup();
    billingMockInstance().controls.patchSettings({ requireCashSession: true });
    await user.click(screen.getByRole("button", { name: "Cobrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Abre la caja antes de cobrar en efectivo.");
  });
});
