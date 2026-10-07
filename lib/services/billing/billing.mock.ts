import type {
  BillingLineItem,
  BillingLineItemInput,
  CashSessionResponse,
  CashSummaryMethod,
  ChargeResponse,
  EstimateResponse,
  EstimateStatus,
  ExchangeRateResponse,
  FinanceSettings,
  InvoiceResponse,
  Paginated,
  PaymentResponse,
  ReceivableListItem,
  RefundResponse,
} from "@/lib/entity/billing";
import { canTransitionEstimate, FINANCE_MODULE } from "@/lib/entity/billing";
import { LEAD_CRM_MODULE } from "@/lib/entity/leads";
import {
  closeCashRequestSchema,
  createChargeRequestSchema,
  createEstimateRequestSchema,
  createInvoiceRequestSchema,
  openCashRequestSchema,
  reasonSchema,
  refundRequestSchema,
  registerPaymentRequestSchema,
  setExchangeRateRequestSchema,
  updateEstimateRequestSchema,
  updateFinanceSettingsRequestSchema,
  updateInvoiceRequestSchema,
} from "@/lib/entity/billing/schemas";
import { calcLineTotal, convertAmount, roundMoney } from "@/lib/utils/billing-currency";
import { dateToLocalDate } from "@/lib/datetime";
import type { ZodTypeAny, z } from "zod";
import {
  BillingApiError,
  emitFinanceModuleDisabled,
  FINANCE_MODULE_DISABLED_MESSAGE,
} from "./billing-errors";
import type { BillingServiceApi } from "./billing.contract";

/**
 * Finanzas — mock en memoria (NEXT_PUBLIC_BILLING_MOCK=true).
 *
 * Replica el contrato y las reglas del backend (`feature/finance-module`): mismos tipos,
 * mismos códigos HTTP y mismos mensajes. Solo datos ficticios.
 * Los tests de contrato (`billing.contract.test.ts`) corren contra esta implementación.
 */

const TOLERANCE = 0.01;
const DAY_MS = 86_400_000;

export const BILLING_MOCK_DEMO_PATIENT_ID = "demo-patient-billing-001";

const DEMO_PATIENTS: Record<string, string> = {
  [BILLING_MOCK_DEMO_PATIENT_ID]: "Ana Demo Pérez",
  "demo-patient-billing-002": "Luis Ficticio Gómez",
  "demo-patient-billing-003": "Carla Ejemplo Ruiz",
};

export interface MockActor {
  isAdmin: boolean;
  name: string;
}

export interface BillingMockOptions {
  /** Latencia simulada en ms (0 en tests). */
  delayMs?: number;
  /** Carga datos de demostración. */
  seed?: boolean;
  /** Fecha "actual" para pruebas deterministas. */
  now?: () => Date;
}

interface IdempotencyEntry {
  fingerprint: string;
  paymentId: string;
}

interface MockState {
  financeEnabled: boolean;
  actor: MockActor;
  settings: FinanceSettings;
  rates: ExchangeRateResponse[];
  estimates: EstimateResponse[];
  invoices: InvoiceResponse[];
  payments: PaymentResponse[];
  refunds: RefundResponse[];
  charges: ChargeResponse[];
  cashSessions: CashSessionResponse[];
  idempotency: Map<string, IdempotencyEntry>;
  counters: { estimate: number; invoice: number; id: number };
}

// ─── Errores con los mensajes del backend ───────────────────────────

const fail = {
  badRequest: (message: string) => new BillingApiError("bad-request", message, 400, "BAD_REQUEST"),
  conflict: (message: string) => new BillingApiError("conflict", message, 409, "CONFLICT"),
  notFound: (entity: string) => new BillingApiError("not-found", `${entity} no existe.`, 404, "NOT_FOUND"),
  forbidden: (message: string) => new BillingApiError("forbidden", message, 403, "FORBIDDEN"),
  validation: (message: string) => new BillingApiError("validation", message, 422, "VALIDATION"),
};

/** Valida como el backend: 422 VALIDATION con todos los problemas en una frase. */
function validate<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const messages = Array.from(new Set(result.error.issues.map((issue) => issue.message)));
    throw fail.validation(messages.join(" "));
  }
  return result.data;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function paginate<T>(items: T[], page = 0, pageSize = 10): Paginated<T> {
  const size = Math.min(Math.max(pageSize, 1), 100);
  const start = Math.max(page, 0) * size;
  return {
    entities: clone(items.slice(start, start + size)),
    pagination: { page: Math.max(page, 0), pageSize: size, total: items.length },
  };
}

function matchesQuery(q: string | undefined, ...fields: (string | null | undefined)[]): boolean {
  if (!q?.trim()) return true;
  const needle = q.trim().toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

function inRange(iso: string, from?: string, to?: string): boolean {
  const day = dateToLocalDate(new Date(iso));
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function createBillingMock(options: BillingMockOptions = {}) {
  const delayMs = options.delayMs ?? 250;
  const now = options.now ?? (() => new Date());

  const state: MockState = initialState();

  function initialState(): MockState {
    return {
      financeEnabled: true,
      actor: { isAdmin: true, name: "Usuario demo" },
      settings: {
        baseCurrency: "NIO",
        baseCurrencyConfigured: false,
        chargePolicy: "SUGGEST",
        allowAdvances: true,
        requireCashSession: false,
        maxDiscountPercent: 20,
        version: 0,
      },
      rates: [],
      estimates: [],
      invoices: [],
      payments: [],
      refunds: [],
      charges: [],
      cashSessions: [],
      idempotency: new Map(),
      counters: { estimate: 0, invoice: 0, id: 0 },
    };
  }

  // ── Utilidades internas ────────────────────────────────────────────

  const nowIso = () => now().toISOString();
  const today = () => dateToLocalDate(now());
  const nextId = (prefix: string) => `${prefix}-${++state.counters.id}`;
  const patientName = (patientId: string) => DEMO_PATIENTS[patientId] ?? "Paciente demo";
  const base = () => state.settings.baseCurrency;

  async function run<T>(operation: () => T): Promise<T> {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (!state.financeEnabled) {
      emitFinanceModuleDisabled();
      throw new BillingApiError("module-disabled", FINANCE_MODULE_DISABLED_MESSAGE, 403, "FORBIDDEN");
    }
    expireEstimates();
    return clone(operation());
  }

  function expireEstimates() {
    const day = today();
    for (const estimate of state.estimates) {
      if ((estimate.status === "DRAFT" || estimate.status === "SENT") && estimate.validUntil && estimate.validUntil < day) {
        estimate.status = "EXPIRED";
        touch(estimate);
      }
    }
  }

  function touch(entity: { updatedAt?: string; version: number }) {
    entity.version += 1;
    if ("updatedAt" in entity) entity.updatedAt = nowIso();
  }

  function hasDocuments() {
    return state.estimates.length + state.invoices.length + state.payments.length > 0;
  }

  /** Unidades de `currency` por 1 de la moneda base (la base vale 1). */
  function resolveRate(currency: string, explicit?: number): number {
    if (currency === base()) return 1;
    if (explicit !== undefined) return explicit;
    const rate = latestRate(currency);
    if (!rate) {
      throw fail.badRequest(`No hay tipo de cambio de ${base()} a ${currency}. Regístralo o envíalo en exchangeRate.`);
    }
    return rate.rate;
  }

  function latestRate(currency: string): ExchangeRateResponse | undefined {
    return state.rates
      .filter((rate) => rate.base === base() && rate.target === currency)
      .sort((a, b) => b.asOf.localeCompare(a.asOf))[0];
  }

  function buildLines(inputs: BillingLineItemInput[], chargeIds: (string | null)[] = []): BillingLineItem[] {
    return inputs.map((input, index) => ({
      id: nextId("line"),
      serviceId: input.serviceId ?? null,
      serviceCode: input.serviceId ? `SRV-${input.serviceId.slice(-4).toUpperCase()}` : null,
      description: input.description.trim(),
      toothRef: input.toothRef ?? null,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      discount: input.discount ?? 0,
      total: calcLineTotal(input.quantity, input.unitPrice, input.discount ?? 0),
      chargeId: chargeIds[index] ?? null,
    }));
  }

  function totals(lines: BillingLineItem[], discount = 0) {
    const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
    if (discount < 0) throw fail.badRequest("El descuento no puede ser negativo.");
    if (discount > subtotal + 1e-9) throw fail.badRequest("El descuento supera el subtotal.");
    return { subtotal, discount, total: roundMoney(subtotal - discount) };
  }

  /** Tope de descuento (`maxDiscountPercent` del bruto) salvo para el Administrador. */
  function checkDiscountCap(lines: BillingLineItem[], globalDiscount: number) {
    if (state.actor.isAdmin) return;
    const gross = roundMoney(lines.reduce((sum, line) => sum + roundMoney(line.quantity * line.unitPrice), 0));
    const discount = roundMoney(lines.reduce((sum, line) => sum + line.discount, 0) + globalDiscount);
    if (gross > 0 && discount > roundMoney((gross * state.settings.maxDiscountPercent) / 100) + 1e-9) {
      throw fail.forbidden(`El descuento supera el máximo permitido (${state.settings.maxDiscountPercent}%).`);
    }
  }

  function findEstimate(id: string) {
    const estimate = state.estimates.find((e) => e.id === id);
    if (!estimate) throw fail.notFound("El presupuesto");
    return estimate;
  }

  function findInvoice(id: string) {
    const invoice = state.invoices.find((i) => i.id === id);
    if (!invoice) throw fail.notFound("El recibo");
    return invoice;
  }

  function findPayment(id: string) {
    const payment = state.payments.find((p) => p.id === id);
    if (!payment) throw fail.notFound("El pago");
    return payment;
  }

  function findCharge(id: string) {
    const charge = state.charges.find((c) => c.id === id);
    if (!charge) throw fail.notFound("El cargo");
    return charge;
  }

  function openSession() {
    return state.cashSessions.find((session) => session.status === "OPEN");
  }

  function refreshInvoiceStatus(invoice: InvoiceResponse) {
    if (invoice.status === "VOID") return;
    invoice.paidAmount = roundMoney(Math.max(0, invoice.paidAmount));
    invoice.balance = roundMoney(Math.max(0, invoice.total - invoice.paidAmount));
    if (invoice.total === 0 || invoice.balance <= TOLERANCE - 1e-9) {
      invoice.status = "PAID";
      invoice.balance = 0;
    } else {
      invoice.status = invoice.paidAmount > 0 ? "PARTIALLY_PAID" : "ISSUED";
    }
    touch(invoice);
  }

  /** Saldo a favor disponible en una moneda: anticipos vivos − devuelto − usado. */
  function creditIn(patientId: string, currency: string): number {
    const advances = state.payments.filter(
      (p) => p.patientId === patientId && !p.voided && !p.invoiceId && p.currency === currency,
    );
    const funded = advances.reduce((sum, p) => sum + p.amount - p.refundedAmount, 0);
    const used = state.payments
      .filter((p) => p.patientId === patientId && !p.voided && p.method === "ADVANCE" && p.currency === currency)
      .reduce((sum, p) => sum + p.amount, 0);
    return roundMoney(funded - used);
  }

  function createInvoiceRecord(params: {
    patientId: string;
    lines: BillingLineItem[];
    discount: number;
    currency: string;
    exchangeRate: number;
    estimateId?: string | null;
    treatmentPlanId?: string | null;
    notes?: string | null;
    dueDate?: string | null;
  }): InvoiceResponse {
    const { subtotal, discount, total } = totals(params.lines, params.discount);
    const timestamp = nowIso();
    const invoice: InvoiceResponse = {
      id: nextId("inv"),
      clinicId: "demo-clinic",
      patientId: params.patientId,
      patientName: patientName(params.patientId),
      code: `R-${String(++state.counters.invoice).padStart(6, "0")}`,
      documentType: "RECEIPT",
      fiscal: false,
      status: "ISSUED",
      estimateId: params.estimateId ?? null,
      treatmentPlanId: params.treatmentPlanId ?? null,
      items: params.lines,
      subtotal,
      discount,
      total,
      paidAmount: 0,
      balance: total,
      currency: params.currency,
      exchangeRate: params.exchangeRate,
      notes: params.notes ?? null,
      issuedAt: timestamp,
      dueDate: params.dueDate ?? null,
      voidReason: null,
      voidedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 0,
    };
    refreshInvoiceStatus(invoice);
    invoice.version = 0;
    state.invoices.unshift(invoice);
    state.settings.baseCurrencyConfigured = true;
    return invoice;
  }

  function sessionDelta(payment: { method: string; currency: string; amount: number }, sign: 1 | -1, kind: "in" | "out") {
    const session = openSession();
    if (!session || payment.method !== "CASH") return null;
    if (payment.currency === session.currency) {
      if (kind === "in") session.cashIn = roundMoney(session.cashIn + sign * payment.amount);
      else session.cashOut = roundMoney(session.cashOut + sign * payment.amount);
      session.expectedCash = roundMoney(session.openingFloat + session.cashIn - session.cashOut);
    } else {
      const delta = (kind === "in" ? 1 : -1) * sign * payment.amount;
      session.otherCurrencies[payment.currency] = roundMoney((session.otherCurrencies[payment.currency] ?? 0) + delta);
    }
    session.version += 1;
    return session;
  }

  function toBase(amount: number, rate: number) {
    return convertAmount(amount, rate, 1);
  }

  // ── Datos de demostración ──────────────────────────────────────────

  function seed() {
    const yesterday = new Date(now().getTime() - DAY_MS).toISOString();
    state.rates.push({ base: "NIO", target: "USD", rate: 0.0273, asOf: dateToLocalDate(new Date(now().getTime() - 2 * DAY_MS)) });
    const demoCharges: Array<[string, string, string | null, number]> = [
      [BILLING_MOCK_DEMO_PATIENT_ID, "Limpieza dental (profilaxis)", null, 1200],
      [BILLING_MOCK_DEMO_PATIENT_ID, "Resina compuesta", "16", 1800],
      ["demo-patient-billing-002", "Consulta de valoración", null, 600],
    ];
    for (const [patientId, description, toothRef, price] of demoCharges) {
      state.charges.push({
        id: nextId("chg"),
        patientId,
        patientName: patientName(patientId),
        sourceType: "APPOINTMENT",
        sourceId: nextId("appt"),
        doctorId: null,
        serviceId: null,
        serviceCode: null,
        description,
        toothRef,
        quantity: 1,
        unitPrice: price,
        total: price,
        currency: "NIO",
        status: "PENDING",
        invoiceId: null,
        dismissReason: null,
        performedAt: yesterday,
        createdAt: yesterday,
        version: 0,
      });
    }
    const lines = buildLines([
      { description: "Endodoncia molar", toothRef: "36", quantity: 1, unitPrice: 6500 },
      { description: "Corona de porcelana", toothRef: "36", quantity: 1, unitPrice: 9000 },
    ]);
    const { subtotal, total } = totals(lines);
    state.estimates.push({
      id: nextId("est"),
      clinicId: "demo-clinic",
      patientId: BILLING_MOCK_DEMO_PATIENT_ID,
      patientName: patientName(BILLING_MOCK_DEMO_PATIENT_ID),
      code: `P-${String(++state.counters.estimate).padStart(6, "0")}`,
      status: "SENT",
      treatmentPlanId: null,
      items: lines,
      subtotal,
      discount: 0,
      total,
      currency: "NIO",
      exchangeRate: 1,
      validUntil: dateToLocalDate(new Date(now().getTime() + 30 * DAY_MS)),
      invoiceId: null,
      notes: null,
      createdAt: yesterday,
      updatedAt: yesterday,
      version: 0,
    });
    const invoice = createInvoiceRecord({
      patientId: "demo-patient-billing-003",
      lines: buildLines([{ description: "Extracción simple", toothRef: "48", quantity: 1, unitPrice: 2500 }]),
      discount: 0,
      currency: "NIO",
      exchangeRate: 1,
      dueDate: dateToLocalDate(new Date(now().getTime() - 40 * DAY_MS)),
    });
    invoice.issuedAt = new Date(now().getTime() - 45 * DAY_MS).toISOString();
  }

  if (options.seed ?? true) seed();

  // ── Implementación del contrato ────────────────────────────────────

  const service: BillingServiceApi = {
    async getCapabilities() {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        specialty: "DENTAL",
        plan: "DEMO",
        operationalStatus: "ACTIVE",
        // LEAD_CRM siempre presente: en modo mock de Finanzas "Adquisición de pacientes" no desaparece.
        modules: state.financeEnabled ? [FINANCE_MODULE, LEAD_CRM_MODULE] : [LEAD_CRM_MODULE],
      };
    },

    getPatientLedger: (patientId) =>
      run(() => {
        const invoices = state.invoices.filter((i) => i.patientId === patientId);
        const live = invoices.filter((i) => i.status !== "VOID");
        const totalCharged = roundMoney(live.reduce((sum, i) => sum + toBase(i.total, i.exchangeRate), 0));
        const totalPaid = roundMoney(live.reduce((sum, i) => sum + toBase(i.paidAmount, i.exchangeRate), 0));
        const currencies = new Set(state.payments.filter((p) => p.patientId === patientId).map((p) => p.currency));
        const creditBalance = roundMoney(
          Array.from(currencies).reduce((sum, currency) => {
            const credit = creditIn(patientId, currency);
            return sum + (credit > 0 ? toBase(credit, resolveRateSafe(currency)) : 0);
          }, 0),
        );
        return {
          patientId,
          currency: base(),
          totalCharged,
          totalPaid,
          balance: roundMoney(totalCharged - totalPaid - creditBalance),
          creditBalance,
          estimates: state.estimates.filter((e) => e.patientId === patientId),
          invoices,
          payments: state.payments.filter((p) => p.patientId === patientId),
          pendingCharges: state.charges.filter((c) => c.patientId === patientId && c.status === "PENDING"),
        };
      }),

    // ── Presupuestos ─────────────────────────────────────────────────
    getEstimates: (query = {}) =>
      run(() =>
        paginate(
          state.estimates.filter(
            (e) =>
              (!query.patientId || e.patientId === query.patientId) &&
              (!query.status || e.status === query.status) &&
              matchesQuery(query.q, e.code, e.patientName),
          ),
          query.page,
          query.pageSize,
        ),
      ),

    getEstimate: (id) => run(() => findEstimate(id)),

    createEstimate: (input) =>
      run(() => {
        const data = validate(createEstimateRequestSchema, input);
        if (data.validUntil && data.validUntil < today()) {
          throw fail.badRequest("La validez del presupuesto no puede estar en el pasado.");
        }
        const currency = data.currency ?? base();
        const lines = buildLines(data.items);
        checkDiscountCap(lines, data.discount ?? 0);
        const { subtotal, discount, total } = totals(lines, data.discount ?? 0);
        const timestamp = nowIso();
        const estimate: EstimateResponse = {
          id: nextId("est"),
          clinicId: "demo-clinic",
          patientId: data.patientId,
          patientName: patientName(data.patientId),
          code: `P-${String(++state.counters.estimate).padStart(6, "0")}`,
          status: data.status ?? "DRAFT",
          treatmentPlanId: data.treatmentPlanId ?? null,
          items: lines,
          subtotal,
          discount,
          total,
          currency,
          exchangeRate: resolveRate(currency, data.exchangeRate),
          validUntil: data.validUntil ?? null,
          invoiceId: null,
          notes: data.notes ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 0,
        };
        state.estimates.unshift(estimate);
        state.settings.baseCurrencyConfigured = true;
        return estimate;
      }),

    updateEstimate: (id, input) =>
      run(() => {
        const data = validate(updateEstimateRequestSchema, input);
        const estimate = findEstimate(id);
        if (estimate.status !== "DRAFT" && estimate.status !== "SENT") {
          throw fail.conflict("Solo se edita un presupuesto en borrador o enviado.");
        }
        if (data.validUntil && data.validUntil < today()) {
          throw fail.badRequest("La validez del presupuesto no puede estar en el pasado.");
        }
        const lines = data.items ? buildLines(data.items) : estimate.items;
        const discount = data.discount ?? estimate.discount;
        if (data.items || discount > estimate.discount) checkDiscountCap(lines, discount);
        const result = totals(lines, discount);
        const currency = data.currency ?? estimate.currency;
        Object.assign(estimate, {
          items: lines,
          ...result,
          currency,
          exchangeRate: data.currency || data.exchangeRate ? resolveRate(currency, data.exchangeRate) : estimate.exchangeRate,
          validUntil: data.validUntil ?? estimate.validUntil,
          notes: data.notes ?? estimate.notes,
        });
        touch(estimate);
        return estimate;
      }),

    changeEstimateStatus: (id, status) =>
      run(() => {
        const estimate = findEstimate(id);
        if (!canTransitionEstimate(estimate.status, status)) {
          throw fail.conflict(`No se puede pasar el presupuesto de ${estimate.status} a ${status}.`);
        }
        estimate.status = status;
        touch(estimate);
        return estimate;
      }),

    convertEstimate: (id) =>
      run(() => {
        const estimate = findEstimate(id);
        const convertible: EstimateStatus[] = ["DRAFT", "SENT", "ACCEPTED"];
        if (!convertible.includes(estimate.status)) {
          throw fail.conflict(
            estimate.status === "CONVERTED"
              ? "El presupuesto ya fue convertido."
              : `Un presupuesto ${estimate.status} no se puede convertir.`,
          );
        }
        const invoice = createInvoiceRecord({
          patientId: estimate.patientId,
          lines: estimate.items.map((line) => ({ ...line, id: nextId("line"), chargeId: null })),
          discount: estimate.discount,
          currency: estimate.currency,
          exchangeRate: estimate.exchangeRate,
          estimateId: estimate.id,
          treatmentPlanId: estimate.treatmentPlanId,
          notes: estimate.notes,
        });
        estimate.status = "CONVERTED";
        estimate.invoiceId = invoice.id;
        touch(estimate);
        return { estimate, invoice };
      }),

    // ── Recibos ──────────────────────────────────────────────────────
    getInvoices: (query = {}) =>
      run(() =>
        paginate(
          state.invoices.filter(
            (i) =>
              (!query.patientId || i.patientId === query.patientId) &&
              (!query.status || i.status === query.status) &&
              matchesQuery(query.q, i.code, i.patientName) &&
              inRange(i.issuedAt, query.from, query.to),
          ),
          query.page,
          query.pageSize,
        ),
      ),

    getInvoice: (id) => run(() => findInvoice(id)),

    createInvoice: (input) =>
      run(() => {
        const data = validate(createInvoiceRequestSchema, input);
        const currency = data.currency ?? base();
        const chargeIds = data.chargeIds ?? [];
        const charges = chargeIds.map(findCharge);
        for (const charge of charges) {
          if (charge.status !== "PENDING") {
            throw fail.conflict(`El cargo «${charge.description}» ya fue facturado o descartado.`);
          }
          if (charge.patientId !== data.patientId) {
            throw fail.badRequest("Todos los cargos deben ser del mismo paciente.");
          }
          if (charge.currency !== currency) {
            throw fail.badRequest(`Los cargos están en ${charge.currency}; emite el recibo en esa moneda.`);
          }
        }
        const chargeLines = buildLines(
          charges.map((charge) => ({
            serviceId: charge.serviceId ?? undefined,
            description: charge.description,
            toothRef: charge.toothRef ?? undefined,
            quantity: charge.quantity,
            unitPrice: charge.unitPrice,
          })),
          charges.map((charge) => charge.id),
        );
        const manualLines = buildLines(data.items ?? []);
        const lines = [...chargeLines, ...manualLines];
        checkDiscountCap(lines, data.discount ?? 0);
        if (data.dueDate && data.dueDate < today()) {
          throw fail.badRequest("El vencimiento no puede estar en el pasado.");
        }
        const invoice = createInvoiceRecord({
          patientId: data.patientId,
          lines,
          discount: data.discount ?? 0,
          currency,
          exchangeRate: resolveRate(currency, data.exchangeRate),
          estimateId: data.estimateId,
          treatmentPlanId: data.treatmentPlanId,
          notes: data.notes,
          dueDate: data.dueDate,
        });
        for (const charge of charges) {
          charge.status = "BILLED";
          charge.invoiceId = invoice.id;
          charge.version += 1;
        }
        return invoice;
      }),

    updateInvoice: (id, input) =>
      run(() => {
        const data = validate(updateInvoiceRequestSchema, input);
        const invoice = findInvoice(id);
        if (invoice.status === "VOID") throw fail.conflict("El recibo está anulado.");
        const changesAmounts = data.items !== undefined || data.discount !== undefined;
        if (changesAmounts) {
          if (invoice.paidAmount > 0) {
            throw fail.conflict("El recibo ya tiene pagos; anúlalos antes de cambiar importes.");
          }
          if (invoice.items.some((line) => line.chargeId)) {
            throw fail.conflict("El recibo tiene cargos vinculados; anúlalo y emite uno nuevo.");
          }
          const lines = data.items ? buildLines(data.items) : invoice.items;
          const discount = data.discount ?? invoice.discount;
          if (data.items || discount > invoice.discount) checkDiscountCap(lines, discount);
          Object.assign(invoice, { items: lines, ...totals(lines, discount) });
          invoice.paidAmount = 0;
        }
        if (data.notes !== undefined) invoice.notes = data.notes;
        if (data.dueDate !== undefined) invoice.dueDate = data.dueDate;
        refreshInvoiceStatus(invoice);
        return invoice;
      }),

    voidInvoice: (id, rawReason) =>
      run(() => {
        const reason = validate(reasonSchema, rawReason);
        const invoice = findInvoice(id);
        if (invoice.status === "VOID") throw fail.conflict("El recibo ya está anulado.");
        if (invoice.paidAmount > 0) {
          throw fail.conflict("El recibo tiene pagos; anúlalos o devuélvelos antes de anular el recibo.");
        }
        invoice.status = "VOID";
        invoice.voidReason = reason;
        invoice.voidedAt = nowIso();
        invoice.balance = 0;
        touch(invoice);
        for (const charge of state.charges.filter((c) => c.invoiceId === invoice.id)) {
          charge.status = "PENDING";
          charge.invoiceId = null;
          charge.version += 1;
        }
        const estimate = state.estimates.find((e) => e.invoiceId === invoice.id);
        if (estimate) {
          estimate.status = "ACCEPTED";
          estimate.invoiceId = null;
          touch(estimate);
        }
        return invoice;
      }),

    // ── Pagos y devoluciones ─────────────────────────────────────────
    getPayments: (query = {}) =>
      run(() =>
        paginate(
          state.payments.filter(
            (p) => (!query.patientId || p.patientId === query.patientId) && inRange(p.paidAt, query.from, query.to),
          ),
          query.page,
          query.pageSize,
        ),
      ),

    async registerPayment(input, idempotencyKey) {
      return run(() => {
        const data = validate(registerPaymentRequestSchema, input);
        const fingerprint = JSON.stringify([data.patientId, data.invoiceId ?? null, data.amount, data.currency, data.method]);
        const previous = state.idempotency.get(idempotencyKey);
        if (previous) {
          if (previous.fingerprint !== fingerprint) {
            throw fail.conflict("Esa Idempotency-Key ya se usó con otro pago.");
          }
          return { payment: findPayment(previous.paymentId), replayed: true };
        }

        if (data.paidAt && new Date(data.paidAt).getTime() > now().getTime() + 60_000) {
          throw fail.badRequest("La fecha del pago no puede estar en el futuro.");
        }
        const rate = resolveRate(data.currency, data.exchangeRate);
        let appliedAmount: number | null = null;
        let invoice: InvoiceResponse | undefined;

        if (data.invoiceId) {
          invoice = findInvoice(data.invoiceId);
          if (invoice.status === "VOID") throw fail.conflict("El recibo está anulado.");
          if (invoice.status === "PAID") throw fail.conflict("El recibo ya está pagado.");
          appliedAmount = convertAmount(data.amount, rate, invoice.exchangeRate);
          if (appliedAmount > invoice.balance + TOLERANCE) {
            throw fail.badRequest(`El pago supera el saldo del recibo (${invoice.balance.toFixed(2)} ${invoice.currency}).`);
          }
          appliedAmount = Math.min(appliedAmount, invoice.balance);
        } else {
          if (data.method === "ADVANCE") {
            throw fail.badRequest("Un pago con saldo a favor debe indicar el recibo a pagar.");
          }
          if (!state.settings.allowAdvances) {
            throw fail.conflict("La clínica no admite anticipos: indica el recibo a pagar.");
          }
        }
        if (data.method === "ADVANCE" && creditIn(data.patientId, data.currency) + 1e-9 < data.amount) {
          throw fail.conflict(`El saldo a favor en ${data.currency} no alcanza.`);
        }
        if (data.method === "CASH" && state.settings.requireCashSession && !openSession()) {
          throw fail.conflict("Abre la caja antes de cobrar en efectivo.");
        }

        const session = sessionDelta({ method: data.method, currency: data.currency, amount: data.amount }, 1, "in");
        const timestamp = nowIso();
        const payment: PaymentResponse = {
          id: nextId("pay"),
          patientId: data.patientId,
          patientName: patientName(data.patientId),
          invoiceId: data.invoiceId ?? null,
          amount: data.amount,
          currency: data.currency,
          exchangeRate: rate,
          appliedAmount,
          refundedAmount: 0,
          method: data.method,
          reference: data.reference ?? null,
          paidAt: data.paidAt ?? timestamp,
          receivedBy: state.actor.name,
          notes: data.notes ?? null,
          voided: false,
          voidReason: null,
          cashSessionId: session?.id ?? null,
          createdAt: timestamp,
          version: 0,
        };
        state.payments.unshift(payment);
        state.idempotency.set(idempotencyKey, { fingerprint, paymentId: payment.id });
        if (invoice && appliedAmount !== null) {
          invoice.paidAmount = roundMoney(invoice.paidAmount + appliedAmount);
          refreshInvoiceStatus(invoice);
        }
        state.settings.baseCurrencyConfigured = true;
        return { payment, replayed: false };
      });
    },

    voidPayment: (id, rawReason) =>
      run(() => {
        const reason = validate(reasonSchema, rawReason);
        const payment = findPayment(id);
        if (payment.voided) throw fail.conflict("El pago ya está anulado.");
        if (payment.refundedAmount > 0) throw fail.conflict("El pago tiene devoluciones; ya no se puede anular.");
        if (payment.cashSessionId) {
          const session = state.cashSessions.find((s) => s.id === payment.cashSessionId);
          if (session?.status === "CLOSED") {
            throw fail.conflict("La caja de este pago ya se cerró; registra una devolución.");
          }
        }
        if (!payment.invoiceId && creditIn(payment.patientId, payment.currency) + 1e-9 < payment.amount) {
          throw fail.conflict("Este anticipo ya se usó para pagar recibos; anula primero esos usos.");
        }
        payment.voided = true;
        payment.voidReason = reason;
        payment.version += 1;
        if (payment.cashSessionId) sessionDelta(payment, -1, "in");
        if (payment.invoiceId && payment.appliedAmount) {
          const invoice = findInvoice(payment.invoiceId);
          invoice.paidAmount = roundMoney(invoice.paidAmount - payment.appliedAmount);
          refreshInvoiceStatus(invoice);
        }
        return payment;
      }),

    refundPayment: (paymentId, input) =>
      run(() => {
        const data = validate(refundRequestSchema, input);
        const payment = findPayment(paymentId);
        if (payment.voided) throw fail.conflict("El pago está anulado.");
        if (payment.method === "ADVANCE") {
          throw fail.conflict("Un pago con saldo a favor no se devuelve; anúlalo para recuperar el saldo.");
        }
        const refundable = roundMoney(payment.amount - payment.refundedAmount);
        if (data.amount > refundable + 1e-9) {
          throw fail.badRequest(`Solo se pueden devolver ${refundable.toFixed(2)} ${payment.currency}.`);
        }
        if (!payment.invoiceId && creditIn(payment.patientId, payment.currency) + 1e-9 < data.amount) {
          throw fail.conflict("Ese saldo a favor ya se usó para pagar recibos.");
        }
        if (data.method === "CASH" && state.settings.requireCashSession && !openSession()) {
          throw fail.conflict("Abre la caja antes de devolver en efectivo.");
        }
        const session = sessionDelta({ method: data.method, currency: payment.currency, amount: data.amount }, 1, "out");
        let appliedAmount: number | null = null;
        if (payment.invoiceId) {
          const invoice = findInvoice(payment.invoiceId);
          appliedAmount = convertAmount(data.amount, payment.exchangeRate, invoice.exchangeRate);
          invoice.paidAmount = roundMoney(invoice.paidAmount - appliedAmount);
          refreshInvoiceStatus(invoice);
        }
        payment.refundedAmount = roundMoney(payment.refundedAmount + data.amount);
        payment.version += 1;
        const refund: RefundResponse = {
          id: nextId("ref"),
          paymentId: payment.id,
          patientId: payment.patientId,
          amount: data.amount,
          currency: payment.currency,
          appliedAmount,
          method: data.method,
          reason: data.reason,
          refundedAt: nowIso(),
          refundedBy: state.actor.name,
          cashSessionId: session?.id ?? null,
        };
        state.refunds.unshift(refund);
        return refund;
      }),

    getRefunds: (query = {}) =>
      run(() =>
        paginate(
          state.refunds.filter(
            (r) => (!query.patientId || r.patientId === query.patientId) && inRange(r.refundedAt, query.from, query.to),
          ),
          query.page,
          query.pageSize,
        ),
      ),

    // ── Cargos ───────────────────────────────────────────────────────
    getCharges: (query = {}) =>
      run(() =>
        paginate(
          state.charges.filter(
            (c) => (!query.patientId || c.patientId === query.patientId) && (!query.status || c.status === query.status),
          ),
          query.page,
          query.pageSize,
        ),
      ),

    createCharge: (input) =>
      run(() => {
        const data = validate(createChargeRequestSchema, input);
        const timestamp = nowIso();
        const charge: ChargeResponse = {
          id: nextId("chg"),
          patientId: data.patientId,
          patientName: patientName(data.patientId),
          sourceType: "MANUAL",
          sourceId: null,
          doctorId: null,
          serviceId: data.serviceId ?? null,
          serviceCode: null,
          description: data.description.trim(),
          toothRef: data.toothRef ?? null,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          total: calcLineTotal(data.quantity, data.unitPrice),
          currency: base(),
          status: "PENDING",
          invoiceId: null,
          dismissReason: null,
          performedAt: data.performedAt ?? timestamp,
          createdAt: timestamp,
          version: 0,
        };
        state.charges.unshift(charge);
        return charge;
      }),

    dismissCharge: (id, rawReason) =>
      run(() => {
        const reason = validate(reasonSchema, rawReason);
        const charge = findCharge(id);
        if (charge.status !== "PENDING") throw fail.conflict("Solo se descarta un cargo pendiente.");
        charge.status = "DISMISSED";
        charge.dismissReason = reason;
        charge.version += 1;
        return charge;
      }),

    // ── Caja ─────────────────────────────────────────────────────────
    getCurrentCashSession: () => run(() => openSession() ?? null),

    getCashSessions: (query = {}) =>
      run(() =>
        paginate(
          [...state.cashSessions].sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
          query.page,
          query.pageSize,
        ),
      ),

    openCashSession: (input) =>
      run(() => {
        const data = validate(openCashRequestSchema, input);
        if (openSession()) throw fail.conflict("Ya hay una caja abierta.");
        const session: CashSessionResponse = {
          id: nextId("cash"),
          status: "OPEN",
          currency: base(),
          openingFloat: data.openingFloat,
          cashIn: 0,
          cashOut: 0,
          expectedCash: data.openingFloat,
          countedCash: null,
          difference: null,
          openedBy: state.actor.name,
          openedAt: nowIso(),
          closedBy: null,
          closedAt: null,
          otherCurrencies: {},
          notes: data.notes ?? null,
          version: 0,
        };
        state.cashSessions.push(session);
        return session;
      }),

    closeCashSession: (id, input) =>
      run(() => {
        const data = validate(closeCashRequestSchema, input);
        const session = state.cashSessions.find((s) => s.id === id);
        if (!session) throw fail.notFound("La caja");
        if (session.status === "CLOSED") throw fail.conflict("La caja ya está cerrada.");
        if (session.version !== data.version) {
          throw fail.conflict("La caja cambió mientras la cerrabas; recarga y vuelve a contar.");
        }
        session.status = "CLOSED";
        session.countedCash = data.countedCash;
        session.difference = roundMoney(data.countedCash - session.expectedCash);
        session.closedBy = state.actor.name;
        session.closedAt = nowIso();
        if (data.notes) session.notes = data.notes;
        session.version += 1;
        return session;
      }),

    // ── Reportes ─────────────────────────────────────────────────────
    getCashSummary: (date) =>
      run(() => {
        const day = date ?? today();
        const byMethod: Record<CashSummaryMethod, number> = { CASH: 0, CARD_POS: 0, TRANSFER: 0, OTHER: 0 };
        for (const payment of state.payments) {
          if (payment.voided || payment.method === "ADVANCE") continue;
          if (dateToLocalDate(new Date(payment.paidAt)) !== day) continue;
          byMethod[payment.method] = roundMoney(byMethod[payment.method] + toBase(payment.amount, payment.exchangeRate));
        }
        const refundedTotal = roundMoney(
          state.refunds
            .filter((r) => dateToLocalDate(new Date(r.refundedAt)) === day)
            .reduce((sum, r) => {
              const payment = state.payments.find((p) => p.id === r.paymentId);
              return sum + toBase(r.amount, payment?.exchangeRate ?? 1);
            }, 0),
        );
        const open = state.invoices.filter((i) => i.status !== "VOID" && i.balance > 0);
        return {
          date: day,
          currency: base(),
          collectedTotal: roundMoney(Object.values(byMethod).reduce((sum, value) => sum + value, 0)),
          byMethod,
          refundedTotal,
          pendingTotal: roundMoney(open.reduce((sum, i) => sum + toBase(i.balance, i.exchangeRate), 0)),
          patientsWithBalance: new Set(open.map((i) => i.patientId)).size,
        };
      }),

    getReceivables: (query = {}) =>
      run(() => {
        const byPatient = new Map<string, ReceivableListItem>();
        const day = now().getTime();
        for (const invoice of state.invoices) {
          if (invoice.status === "VOID" || invoice.balance <= 0) continue;
          const balance = toBase(invoice.balance, invoice.exchangeRate);
          const item =
            byPatient.get(invoice.patientId) ??
            {
              patientId: invoice.patientId,
              patientName: invoice.patientName,
              balance: 0,
              currency: base(),
              oldestDueDate: null,
              invoiceCount: 0,
              aging: { current: 0, days31To60: 0, days61To90: 0, over90: 0 },
            };
          const reference = invoice.dueDate ?? dateToLocalDate(new Date(invoice.issuedAt));
          const days = Math.floor((day - new Date(`${reference}T00:00`).getTime()) / DAY_MS);
          const bucket = days <= 30 ? "current" : days <= 60 ? "days31To60" : days <= 90 ? "days61To90" : "over90";
          item.aging[bucket] = roundMoney(item.aging[bucket] + balance);
          item.balance = roundMoney(item.balance + balance);
          item.invoiceCount += 1;
          if (!item.oldestDueDate || reference < item.oldestDueDate) item.oldestDueDate = reference;
          byPatient.set(invoice.patientId, item);
        }
        const rows = Array.from(byPatient.values())
          .filter((row) => matchesQuery(query.q, row.patientName))
          .sort((a, b) => b.balance - a.balance);
        return paginate(rows, query.page, query.pageSize);
      }),

    getDashboard: (query = {}) =>
      run(() => {
        const current = now();
        const from = query.from ?? dateToLocalDate(new Date(current.getFullYear(), current.getMonth(), 1));
        const to = query.to ?? today();
        const span = (new Date(`${to}T00:00`).getTime() - new Date(`${from}T00:00`).getTime()) / DAY_MS;
        if (Number.isNaN(span) || span < 0 || span > 366) {
          throw fail.badRequest("El rango debe ser válido y de hasta 366 días.");
        }
        const issued = state.invoices.filter((i) => i.status !== "VOID" && inRange(i.issuedAt, from, to));
        const payments = state.payments.filter((p) => !p.voided && p.method !== "ADVANCE" && inRange(p.paidAt, from, to));
        const collectedByMethod: Record<string, number> = {};
        for (const payment of payments) {
          collectedByMethod[payment.method] = roundMoney(
            (collectedByMethod[payment.method] ?? 0) + toBase(payment.amount, payment.exchangeRate),
          );
        }
        return {
          from,
          to,
          currency: base(),
          issuedTotal: roundMoney(issued.reduce((sum, i) => sum + toBase(i.total, i.exchangeRate), 0)),
          discountTotal: roundMoney(
            issued.reduce(
              (sum, i) => sum + toBase(i.discount + i.items.reduce((acc, line) => acc + line.discount, 0), i.exchangeRate),
              0,
            ),
          ),
          collectedTotal: roundMoney(Object.values(collectedByMethod).reduce((sum, v) => sum + v, 0)),
          refundedTotal: roundMoney(
            state.refunds
              .filter((r) => inRange(r.refundedAt, from, to))
              .reduce((sum, r) => {
                const payment = state.payments.find((p) => p.id === r.paymentId);
                return sum + toBase(r.amount, payment?.exchangeRate ?? 1);
              }, 0),
          ),
          outstandingTotal: roundMoney(
            state.invoices
              .filter((i) => i.status !== "VOID")
              .reduce((sum, i) => sum + toBase(i.balance, i.exchangeRate), 0),
          ),
          collectedByMethod,
          documentsIssued: issued.length,
          paymentsCount: payments.length,
          pendingCharges: state.charges.filter((c) => c.status === "PENDING").length,
        };
      }),

    // ── Configuración y tipos de cambio ──────────────────────────────
    getSettings: () => run(() => state.settings),

    updateSettings: (input) =>
      run(() => {
        if (!state.actor.isAdmin) throw fail.forbidden("No tienes permisos para realizar esta acción.");
        const data = validate(updateFinanceSettingsRequestSchema, input);
        if (data.version !== state.settings.version) {
          throw fail.conflict("La configuración cambió; recarga y vuelve a intentar.");
        }
        const nextBase = data.baseCurrency ?? "NIO";
        if (nextBase !== state.settings.baseCurrency && hasDocuments()) {
          throw fail.conflict("La moneda base no puede cambiar porque ya hay documentos de finanzas.");
        }
        state.settings = {
          baseCurrency: nextBase,
          baseCurrencyConfigured: state.settings.baseCurrencyConfigured || data.baseCurrency !== null,
          chargePolicy: data.chargePolicy,
          allowAdvances: data.allowAdvances,
          requireCashSession: data.requireCashSession,
          maxDiscountPercent: data.maxDiscountPercent,
          version: state.settings.version + 1,
        };
        return state.settings;
      }),

    getExchangeRate: (query) =>
      run(() => {
        const from = query.base ?? base();
        if (from !== base()) {
          throw fail.badRequest(`Los tipos de cambio se expresan contra la moneda base ${base()}.`);
        }
        if (query.target === base()) return { base: base(), target: base(), rate: 1, asOf: today() };
        return latestRate(query.target) ?? null;
      }),

    setExchangeRate: (input) =>
      run(() => {
        const data = validate(setExchangeRateRequestSchema, input);
        if (data.target === base()) throw fail.badRequest("La moneda base siempre vale 1.");
        const asOf = data.asOf ?? today();
        if (asOf > today()) throw fail.badRequest("La fecha del tipo de cambio no puede estar en el futuro.");
        const rate: ExchangeRateResponse = { base: base(), target: data.target, rate: data.rate, asOf };
        state.rates = state.rates.filter((r) => !(r.target === data.target && r.asOf === asOf));
        state.rates.push(rate);
        return rate;
      }),
  };

  function resolveRateSafe(currency: string): number {
    if (currency === base()) return 1;
    return latestRate(currency)?.rate ?? 1;
  }

  /** Controles solo para tests y demos (no forman parte del contrato). */
  const controls = {
    setFinanceEnabled(enabled: boolean) {
      state.financeEnabled = enabled;
    },
    setActor(actor: Partial<MockActor>) {
      state.actor = { ...state.actor, ...actor };
    },
    patchSettings(patch: Partial<FinanceSettings>) {
      state.settings = { ...state.settings, ...patch };
    },
    /** Simula un cargo generado por el backend al completar una cita. */
    addAppointmentCharge(patientId: string, description: string, unitPrice: number): ChargeResponse {
      const timestamp = nowIso();
      const charge: ChargeResponse = {
        id: nextId("chg"),
        patientId,
        patientName: patientName(patientId),
        sourceType: "APPOINTMENT",
        sourceId: nextId("appt"),
        doctorId: null,
        serviceId: null,
        serviceCode: null,
        description,
        toothRef: null,
        quantity: 1,
        unitPrice,
        total: unitPrice,
        currency: base(),
        status: "PENDING",
        invoiceId: null,
        dismissReason: null,
        performedAt: timestamp,
        createdAt: timestamp,
        version: 0,
      };
      state.charges.unshift(charge);
      return clone(charge);
    },
  };

  return { service, controls };
}

export type BillingMock = ReturnType<typeof createBillingMock>;

/** Instancia compartida por la app cuando NEXT_PUBLIC_BILLING_MOCK=true. */
const defaultMock = createBillingMock();

export const billingMock: BillingServiceApi = defaultMock.service;
export const billingMockControls = defaultMock.controls;

