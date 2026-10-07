import { beforeEach, describe, expect, it } from "vitest";
import {
  cashSessionResponseSchema,
  chargeResponseSchema,
  estimateResponseSchema,
  financeSettingsSchema,
  invoiceResponseSchema,
  paginatedSchema,
  patientLedgerResponseSchema,
  paymentResponseSchema,
  refundResponseSchema,
} from "@/lib/entity/billing/schemas";
import { FINANCE_MODULE_DISABLED_MESSAGE } from "./billing-errors";
import { createBillingMock, type BillingMock } from "./billing.mock";

/**
 * Contrato de Finanzas ejecutado contra el mock (§10: el mock no puede divergir del contrato).
 * Cada caso refleja una regla del backend (`feature/finance-module`) con su código y mensaje.
 */

const PATIENT = "patient-a";
const OTHER_PATIENT = "patient-b";
const FIXED_NOW = new Date("2026-10-01T15:00:00Z");

let mock: BillingMock;
let api: BillingMock["service"];

beforeEach(() => {
  mock = createBillingMock({ delayMs: 0, seed: false, now: () => FIXED_NOW });
  api = mock.service;
});

const twoLines = [
  { description: "Limpieza dental", quantity: 1, unitPrice: 1200 },
  { description: "Resina", toothRef: "16", quantity: 2, unitPrice: 900, discount: 100 },
];

async function issueInvoice(total = 1000, patientId = PATIENT) {
  return api.createInvoice({
    patientId,
    items: [{ description: "Tratamiento", quantity: 1, unitPrice: total }],
  });
}

describe("contrato: interruptor del módulo", () => {
  it("capabilities incluye FINANCE cuando el módulo está activo", async () => {
    expect((await api.getCapabilities()).modules).toContain("FINANCE");
  });

  it("LEAD_CRM es independiente de FINANCE: sigue presente con Finanzas apagado", async () => {
    expect((await api.getCapabilities()).modules).toContain("LEAD_CRM");
    mock.controls.setFinanceEnabled(false);
    expect((await api.getCapabilities()).modules).toEqual(["LEAD_CRM"]);
  });

  it("con el módulo apagado: capabilities sin FINANCE y 403 con el mensaje exacto en /billing", async () => {
    mock.controls.setFinanceEnabled(false);
    expect((await api.getCapabilities()).modules).not.toContain("FINANCE");
    await expect(api.getInvoices()).rejects.toMatchObject({
      status: 403,
      kind: "module-disabled",
      message: FINANCE_MODULE_DISABLED_MESSAGE,
    });
  });

  it("al reactivar el módulo el historial sigue ahí", async () => {
    await issueInvoice();
    mock.controls.setFinanceEnabled(false);
    mock.controls.setFinanceEnabled(true);
    expect((await api.getInvoices()).pagination.total).toBe(1);
  });
});

describe("contrato: presupuestos", () => {
  it("crea con código P-, totales HALF_UP y cumple el schema", async () => {
    const estimate = await api.createEstimate({ patientId: PATIENT, items: twoLines, discount: 50 });
    expect(estimateResponseSchema.safeParse(estimate).success).toBe(true);
    expect(estimate).toMatchObject({ code: "P-000001", status: "DRAFT", subtotal: 2900, discount: 50, total: 2850 });
    expect(estimate.items[1].total).toBe(1700);
  });

  it("enviar → aceptar → convertir crea un recibo R- idéntico", async () => {
    const estimate = await api.createEstimate({ patientId: PATIENT, items: twoLines, status: "SENT" });
    await api.changeEstimateStatus(estimate.id, "ACCEPTED");
    const { estimate: converted, invoice } = await api.convertEstimate(estimate.id);
    expect(invoiceResponseSchema.safeParse(invoice).success).toBe(true);
    expect(converted).toMatchObject({ status: "CONVERTED", invoiceId: invoice.id });
    expect(invoice).toMatchObject({ code: "R-000001", documentType: "RECEIPT", fiscal: false, total: estimate.total });
    await expect(api.convertEstimate(estimate.id)).rejects.toMatchObject({
      status: 409,
      message: "El presupuesto ya fue convertido.",
    });
  });

  it("rechaza transiciones no permitidas con 409", async () => {
    const estimate = await api.createEstimate({ patientId: PATIENT, items: twoLines });
    await api.changeEstimateStatus(estimate.id, "REJECTED");
    await expect(api.changeEstimateStatus(estimate.id, "ACCEPTED")).rejects.toMatchObject({
      status: 409,
      message: "No se puede pasar el presupuesto de REJECTED a ACCEPTED.",
    });
  });

  it("solo edita en borrador o enviado", async () => {
    const estimate = await api.createEstimate({ patientId: PATIENT, items: twoLines });
    await api.changeEstimateStatus(estimate.id, "ACCEPTED");
    await expect(api.updateEstimate(estimate.id, { notes: "x" })).rejects.toMatchObject({
      status: 409,
      message: "Solo se edita un presupuesto en borrador o enviado.",
    });
  });

  it("valida la entrada con 422 VALIDATION y el mensaje del backend", async () => {
    await expect(
      api.createEstimate({ patientId: PATIENT, items: [{ description: "X", quantity: 0, unitPrice: 10 }] }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION", message: "La cantidad debe ser mayor a 0." });
    await expect(
      api.createEstimate({ patientId: PATIENT, items: [{ description: "X", quantity: 1, unitPrice: 10.123 }] }),
    ).rejects.toMatchObject({ status: 422, message: "El precio admite como máximo 2 decimales." });
  });

  it("la validez no puede estar en el pasado", async () => {
    await expect(
      api.createEstimate({ patientId: PATIENT, items: twoLines, validUntil: "2026-09-01" }),
    ).rejects.toMatchObject({ status: 400, message: "La validez del presupuesto no puede estar en el pasado." });
  });
});

describe("contrato: recibos y cargos", () => {
  it("un recibo con total 0 nace PAID", async () => {
    const invoice = await api.createInvoice({
      patientId: PATIENT,
      items: [{ description: "Control", quantity: 1, unitPrice: 0 }],
    });
    expect(invoice).toMatchObject({ status: "PAID", balance: 0 });
  });

  it("cobra cargos pendientes una sola vez y al anular el recibo vuelven a PENDING", async () => {
    const charge = mock.controls.addAppointmentCharge(PATIENT, "Profilaxis", 1200);
    expect(chargeResponseSchema.safeParse(charge).success).toBe(true);
    const invoice = await api.createInvoice({ patientId: PATIENT, chargeIds: [charge.id] });
    expect(invoice.items[0].chargeId).toBe(charge.id);
    await expect(api.createInvoice({ patientId: PATIENT, chargeIds: [charge.id] })).rejects.toMatchObject({
      status: 409,
      message: "El cargo «Profilaxis» ya fue facturado o descartado.",
    });
    await expect(api.updateInvoice(invoice.id, { discount: 10 })).rejects.toMatchObject({
      status: 409,
      message: "El recibo tiene cargos vinculados; anúlalo y emite uno nuevo.",
    });
    await api.voidInvoice(invoice.id, "Error de captura");
    const charges = await api.getCharges({ patientId: PATIENT });
    expect(charges.entities[0]).toMatchObject({ status: "PENDING", invoiceId: null });
  });

  it("no mezcla cargos de distintos pacientes", async () => {
    const charge = mock.controls.addAppointmentCharge(OTHER_PATIENT, "Consulta", 600);
    await expect(api.createInvoice({ patientId: PATIENT, chargeIds: [charge.id] })).rejects.toMatchObject({
      status: 400,
      message: "Todos los cargos deben ser del mismo paciente.",
    });
  });

  it("anular exige motivo de 5 a 500 caracteres", async () => {
    const invoice = await issueInvoice();
    await expect(api.voidInvoice(invoice.id, "no")).rejects.toMatchObject({
      status: 422,
      message: "El motivo debe tener al menos 5 caracteres.",
    });
  });

  it("no anula un recibo con pagos vivos", async () => {
    const invoice = await issueInvoice(1000);
    await api.registerPayment({ patientId: PATIENT, invoiceId: invoice.id, amount: 300, currency: "NIO", method: "CASH" }, "k1");
    await expect(api.voidInvoice(invoice.id, "Error de captura")).rejects.toMatchObject({
      status: 409,
      message: "El recibo tiene pagos; anúlalos o devuélvelos antes de anular el recibo.",
    });
  });

  it("descartar solo aplica a cargos pendientes", async () => {
    const charge = mock.controls.addAppointmentCharge(PATIENT, "Radiografía", 400);
    await api.dismissCharge(charge.id, "Cortesía de la clínica");
    await expect(api.dismissCharge(charge.id, "Otra vez")).rejects.toMatchObject({
      status: 409,
      message: "Solo se descarta un cargo pendiente.",
    });
  });
});

describe("contrato: pagos e idempotencia", () => {
  it("pago parcial → PARTIALLY_PAID; reintento con la misma clave no duplica", async () => {
    const invoice = await issueInvoice(1000);
    const payment = { patientId: PATIENT, invoiceId: invoice.id, amount: 400, currency: "NIO", method: "CASH" as const };
    const first = await api.registerPayment(payment, "same-key");
    expect(paymentResponseSchema.safeParse(first.payment).success).toBe(true);
    expect(first.replayed).toBe(false);
    const retry = await api.registerPayment(payment, "same-key");
    expect(retry).toMatchObject({ replayed: true, payment: { id: first.payment.id } });
    expect((await api.getPayments({ patientId: PATIENT })).pagination.total).toBe(1);
    expect(await api.getInvoice(invoice.id)).toMatchObject({ status: "PARTIALLY_PAID", paidAmount: 400, balance: 600 });
  });

  it("la misma clave con otro monto es 409", async () => {
    const invoice = await issueInvoice(1000);
    await api.registerPayment({ patientId: PATIENT, invoiceId: invoice.id, amount: 100, currency: "NIO", method: "CASH" }, "k");
    await expect(
      api.registerPayment({ patientId: PATIENT, invoiceId: invoice.id, amount: 200, currency: "NIO", method: "CASH" }, "k"),
    ).rejects.toMatchObject({ status: 409, message: "Esa Idempotency-Key ya se usó con otro pago." });
  });

  it("no supera el saldo del recibo (400 con el saldo en el mensaje)", async () => {
    const invoice = await issueInvoice(1000);
    await expect(
      api.registerPayment({ patientId: PATIENT, invoiceId: invoice.id, amount: 1000.02, currency: "NIO", method: "CASH" }, "k"),
    ).rejects.toMatchObject({ status: 400, message: "El pago supera el saldo del recibo (1000.00 NIO)." });
  });

  it("en otra moneda sin tasa responde 400; con tasa guardada aplica convertido", async () => {
    const invoice = await issueInvoice(3663);
    const usd = { patientId: PATIENT, invoiceId: invoice.id, amount: 50, currency: "USD", method: "CARD_POS" as const };
    await expect(api.registerPayment(usd, "k1")).rejects.toMatchObject({
      status: 400,
      message: "No hay tipo de cambio de NIO a USD. Regístralo o envíalo en exchangeRate.",
    });
    expect(await api.getExchangeRate({ target: "USD" })).toBeNull();
    await api.setExchangeRate({ target: "USD", rate: 0.0273 });
    const { payment } = await api.registerPayment(usd, "k2");
    expect(payment.appliedAmount).toBe(1831.5);
  });

  it("ADVANCE exige saldo a favor suficiente y no se devuelve", async () => {
    const invoice = await issueInvoice(500);
    const advancePay = { patientId: PATIENT, invoiceId: invoice.id, amount: 200, currency: "NIO", method: "ADVANCE" as const };
    await expect(api.registerPayment(advancePay, "k1")).rejects.toMatchObject({
      status: 409,
      message: "El saldo a favor en NIO no alcanza.",
    });
    await api.registerPayment({ patientId: PATIENT, amount: 300, currency: "NIO", method: "TRANSFER" }, "k2");
    const { payment } = await api.registerPayment(advancePay, "k3");
    expect((await api.getPatientLedger(PATIENT)).creditBalance).toBe(100);
    await expect(api.refundPayment(payment.id, { amount: 50, method: "CASH", reason: "Devolución" })).rejects.toMatchObject({
      status: 409,
      message: "Un pago con saldo a favor no se devuelve; anúlalo para recuperar el saldo.",
    });
  });

  it("sin allowAdvances un pago sin recibo es 409", async () => {
    mock.controls.patchSettings({ allowAdvances: false });
    await expect(
      api.registerPayment({ patientId: PATIENT, amount: 100, currency: "NIO", method: "CASH" }, "k"),
    ).rejects.toMatchObject({ status: 409, message: "La clínica no admite anticipos: indica el recibo a pagar." });
  });

  it("devolución: máximo lo no devuelto y el recibo vuelve a deber", async () => {
    const invoice = await issueInvoice(1000);
    const { payment } = await api.registerPayment(
      { patientId: PATIENT, invoiceId: invoice.id, amount: 1000, currency: "NIO", method: "TRANSFER" },
      "k",
    );
    const refund = await api.refundPayment(payment.id, { amount: 400, method: "TRANSFER", reason: "Ajuste de tratamiento" });
    expect(refundResponseSchema.safeParse(refund).success).toBe(true);
    expect(await api.getInvoice(invoice.id)).toMatchObject({ status: "PARTIALLY_PAID", balance: 400 });
    await expect(api.refundPayment(payment.id, { amount: 700, method: "TRANSFER", reason: "Otra devolución" })).rejects.toMatchObject({
      status: 400,
      message: "Solo se pueden devolver 600.00 NIO.",
    });
    await expect(api.voidPayment(payment.id, "Error de captura")).rejects.toMatchObject({
      status: 409,
      message: "El pago tiene devoluciones; ya no se puede anular.",
    });
  });
});

describe("contrato: caja", () => {
  it("exige caja abierta para efectivo cuando requireCashSession", async () => {
    mock.controls.patchSettings({ requireCashSession: true });
    const invoice = await issueInvoice(1000);
    await expect(
      api.registerPayment({ patientId: PATIENT, invoiceId: invoice.id, amount: 100, currency: "NIO", method: "CASH" }, "k"),
    ).rejects.toMatchObject({ status: 409, message: "Abre la caja antes de cobrar en efectivo." });
  });

  it("una sola caja abierta; esperado = fondo + entradas − salidas; otras monedas aparte", async () => {
    expect(await api.getCurrentCashSession()).toBeNull();
    const session = await api.openCashSession({ openingFloat: 500 });
    expect(cashSessionResponseSchema.safeParse(session).success).toBe(true);
    await expect(api.openCashSession({ openingFloat: 100 })).rejects.toMatchObject({
      status: 409,
      message: "Ya hay una caja abierta.",
    });
    await api.setExchangeRate({ target: "USD", rate: 0.0273 });
    await api.registerPayment({ patientId: PATIENT, amount: 300, currency: "NIO", method: "CASH" }, "k1");
    await api.registerPayment({ patientId: PATIENT, amount: 20, currency: "USD", method: "CASH" }, "k2");
    const current = await api.getCurrentCashSession();
    expect(current).toMatchObject({ cashIn: 300, expectedCash: 800, otherCurrencies: { USD: 20 } });
  });

  it("cerrar exige la version vigente y congela la diferencia; un pago de caja cerrada no se anula", async () => {
    const session = await api.openCashSession({ openingFloat: 500 });
    const { payment } = await api.registerPayment({ patientId: PATIENT, amount: 300, currency: "NIO", method: "CASH" }, "k");
    await expect(api.closeCashSession(session.id, { countedCash: 790, version: session.version })).rejects.toMatchObject({
      status: 409,
      message: "La caja cambió mientras la cerrabas; recarga y vuelve a contar.",
    });
    const current = (await api.getCurrentCashSession())!;
    const closed = await api.closeCashSession(current.id, { countedCash: 790, version: current.version });
    expect(closed).toMatchObject({ status: "CLOSED", expectedCash: 800, countedCash: 790, difference: -10 });
    await expect(api.voidPayment(payment.id, "Error de captura")).rejects.toMatchObject({
      status: 409,
      message: "La caja de este pago ya se cerró; registra una devolución.",
    });
    expect(
      paginatedSchema(cashSessionResponseSchema).safeParse(await api.getCashSessions()).success,
    ).toBe(true);
  });
});

describe("contrato: cuenta, reportes y configuración", () => {
  it("la cuenta del paciente cumple el schema y suma en moneda base", async () => {
    const invoice = await issueInvoice(1000);
    await api.registerPayment({ patientId: PATIENT, invoiceId: invoice.id, amount: 250, currency: "NIO", method: "CASH" }, "k");
    mock.controls.addAppointmentCharge(PATIENT, "Profilaxis", 1200);
    const ledger = await api.getPatientLedger(PATIENT);
    expect(patientLedgerResponseSchema.safeParse(ledger).success).toBe(true);
    expect(ledger).toMatchObject({ currency: "NIO", totalCharged: 1000, totalPaid: 250, balance: 750 });
    expect(ledger.pendingCharges).toHaveLength(1);
  });

  it("dashboard rechaza rangos de más de 366 días", async () => {
    await expect(api.getDashboard({ from: "2024-01-01", to: "2026-01-01" })).rejects.toMatchObject({
      status: 400,
      message: "El rango debe ser válido y de hasta 366 días.",
    });
  });

  it("por cobrar ordena por mayor saldo con antigüedad", async () => {
    await issueInvoice(300, OTHER_PATIENT);
    await issueInvoice(900, PATIENT);
    const page = await api.getReceivables();
    expect(page.entities.map((r) => r.patientId)).toEqual([PATIENT, OTHER_PATIENT]);
    expect(page.entities[0].aging.current).toBe(900);
  });

  it("configuración: exige la version y bloquea la moneda base con documentos", async () => {
    const settings = await api.getSettings();
    expect(financeSettingsSchema.safeParse(settings).success).toBe(true);
    const update = {
      baseCurrency: "USD",
      chargePolicy: "SUGGEST" as const,
      allowAdvances: true,
      requireCashSession: false,
      maxDiscountPercent: 10,
    };
    await expect(api.updateSettings({ ...update, version: settings.version + 5 })).rejects.toMatchObject({
      status: 409,
      message: "La configuración cambió; recarga y vuelve a intentar.",
    });
    await issueInvoice();
    await expect(api.updateSettings({ ...update, version: settings.version })).rejects.toMatchObject({
      status: 409,
      message: "La moneda base no puede cambiar porque ya hay documentos de finanzas.",
    });
  });

  it("los descuentos sobre el máximo son 403 salvo para el Administrador", async () => {
    mock.controls.setActor({ isAdmin: false });
    await expect(
      api.createEstimate({
        patientId: PATIENT,
        items: [{ description: "Corona", quantity: 1, unitPrice: 1000, discount: 300 }],
      }),
    ).rejects.toMatchObject({ status: 403, message: "El descuento supera el máximo permitido (20%)." });
    mock.controls.setActor({ isAdmin: true });
    await expect(
      api.createEstimate({
        patientId: PATIENT,
        items: [{ description: "Corona", quantity: 1, unitPrice: 1000, discount: 300 }],
      }),
    ).resolves.toMatchObject({ total: 700 });
  });
});
