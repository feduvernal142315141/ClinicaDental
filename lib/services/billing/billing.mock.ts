import {
  calcDocumentTotal,
  calcLineTotal,
  calcSubtotal,
  roundMoney,
} from "@/lib/utils/billing-currency";
import type {
  BillingLineItem,
  BillingLineItemInput,
  BillingQueryParams,
  CashSummaryResponse,
  ConvertEstimateResult,
  CreateEstimateRequest,
  CreateInvoiceRequest,
  EstimateResponse,
  EstimateStatus,
  ExchangeRateResponse,
  InvoiceResponse,
  InvoiceStatus,
  PaginatedEstimatesResponse,
  PaginatedInvoicesResponse,
  PaginatedPaymentsResponse,
  PaginatedReceivablesResponse,
  PatientLedgerResponse,
  PaymentMethod,
  PaymentResponse,
  RegisterPaymentRequest,
  UpdateEstimateRequest,
  UpdateEstimateStatusRequest,
  UpdateInvoiceRequest,
} from "@/lib/entity/billing";
import type { BillingServiceApi as BillingApiShape } from "./billing.api";

/**
 * Billing mock — store en memoria para desarrollo front-first.
 * Activo cuando NEXT_PUBLIC_BILLING_MOCK=true.
 */

const DEMO_PATIENT_ID = "demo-patient-billing-001";
const CLINIC_CURRENCY = "USD";

let estimateSeq = 3;
let invoiceSeq = 2;
let lineSeq = 10;

function nowIso(): string {
  return new Date().toISOString();
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function toLineItems(items: BillingLineItemInput[]): BillingLineItem[] {
  return items.map((item) => ({
    id: uid(`li-${++lineSeq}`),
    serviceId: item.serviceId,
    description: item.description,
    toothRef: item.toothRef,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount ?? 0,
    total: calcLineTotal(item.quantity, item.unitPrice, item.discount ?? 0),
  }));
}

function inferInvoiceStatus(total: number, paidAmount: number): InvoiceStatus {
  if (paidAmount <= 0) return "ISSUED";
  if (paidAmount >= total) return "PAID";
  return "PARTIALLY_PAID";
}

function paginate<T>(
  entities: T[],
  params?: BillingQueryParams,
): { entities: T[]; pagination: { page: number; pageSize: number; total: number } } {
  const page = params?.page ?? 0;
  const pageSize = params?.pageSize ?? 10;
  const start = page * pageSize;
  return {
    entities: entities.slice(start, start + pageSize),
    pagination: { page, pageSize, total: entities.length },
  };
}

function delay(ms = 180): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Seed data ──────────────────────────────────────────────────────

const seedItems: BillingLineItem[] = [
  {
    id: "li-1",
    serviceId: "svc-clean",
    description: "Limpieza dental",
    quantity: 1,
    unitPrice: 40,
    discount: 0,
    total: 40,
  },
  {
    id: "li-2",
    serviceId: "svc-fill",
    description: "Obturación resina",
    toothRef: "16",
    quantity: 1,
    unitPrice: 80,
    discount: 0,
    total: 80,
  },
];

const estimates: EstimateResponse[] = [
  {
    id: "est-001",
    patientId: DEMO_PATIENT_ID,
    code: "P-000001",
    status: "SENT",
    items: seedItems,
    subtotal: 120,
    discount: 0,
    total: 120,
    currency: "USD",
    exchangeRate: 1,
    validUntil: "2026-08-31",
    notes: "Presupuesto demo — limpieza + obturación",
    createdAt: "2026-07-10T15:00:00.000Z",
    updatedAt: "2026-07-10T15:00:00.000Z",
  },
  {
    id: "est-002",
    patientId: DEMO_PATIENT_ID,
    code: "P-000002",
    status: "CONVERTED",
    invoiceId: "inv-001",
    items: [
      {
        id: "li-3",
        serviceId: "svc-endo",
        description: "Endodoncia unirradicular",
        toothRef: "21",
        quantity: 1,
        unitPrice: 200,
        discount: 0,
        total: 200,
      },
    ],
    subtotal: 200,
    discount: 0,
    total: 200,
    currency: "USD",
    exchangeRate: 1,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-05T12:00:00.000Z",
  },
];

const invoices: InvoiceResponse[] = [
  {
    id: "inv-001",
    patientId: DEMO_PATIENT_ID,
    code: "F-000001",
    status: "PARTIALLY_PAID",
    estimateId: "est-002",
    items: [
      {
        id: "li-3",
        serviceId: "svc-endo",
        description: "Endodoncia unirradicular",
        toothRef: "21",
        quantity: 1,
        unitPrice: 200,
        discount: 0,
        total: 200,
      },
    ],
    subtotal: 200,
    discount: 0,
    total: 200,
    paidAmount: 80,
    balance: 120,
    currency: "USD",
    exchangeRate: 1,
    issuedAt: "2026-07-05T12:00:00.000Z",
    createdAt: "2026-07-05T12:00:00.000Z",
    updatedAt: "2026-07-12T18:00:00.000Z",
  },
];

const payments: PaymentResponse[] = [
  {
    id: "pay-001",
    patientId: DEMO_PATIENT_ID,
    invoiceId: "inv-001",
    amount: 80,
    currency: "USD",
    exchangeRate: 1,
    method: "CASH",
    paidAt: "2026-07-12T18:00:00.000Z",
    notes: "Abono inicial en efectivo",
    createdAt: "2026-07-12T18:00:00.000Z",
  },
];

const exchangeRates: Record<string, number> = {
  "USD:USD": 1,
  "USD:NIO": 36.5,
  "NIO:USD": 1 / 36.5,
  "USD:BOB": 6.91,
  "BOB:USD": 1 / 6.91,
};

// ─── Internals ──────────────────────────────────────────────────────

function rebuildLedger(patientId: string): PatientLedgerResponse {
  const patientInvoices = invoices.filter(
    (i) => i.patientId === patientId && i.status !== "VOID",
  );
  const patientPayments = payments.filter(
    (p) => p.patientId === patientId && !p.voided,
  );
  const patientEstimates = estimates.filter((e) => e.patientId === patientId);

  const totalCharged = roundMoney(
    patientInvoices.reduce((s, i) => s + i.total, 0),
  );
  const totalPaid = roundMoney(
    patientPayments.reduce((s, p) => s + p.amount, 0),
  );
  const unallocated = patientPayments
    .filter((p) => !p.invoiceId)
    .reduce((s, p) => s + p.amount, 0);

  return {
    patientId,
    currency: CLINIC_CURRENCY,
    totalCharged,
    totalPaid,
    balance: roundMoney(totalCharged - totalPaid),
    creditBalance: roundMoney(unallocated),
    estimates: patientEstimates,
    invoices: patientInvoices,
    payments: patientPayments,
  };
}

/** Clona el seed demo una sola vez por paciente para poder probar UI con cualquier ID. */
const seededPatients = new Set<string>([DEMO_PATIENT_ID]);

function ensureSeedForPatient(patientId: string): void {
  if (seededPatients.has(patientId)) return;
  seededPatients.add(patientId);

  const idMap = new Map<string, string>();
  const remap = (oldId: string) => {
    const next = uid(oldId.split("-")[0] ?? "x");
    idMap.set(oldId, next);
    return next;
  };

  for (const est of estimates.filter((e) => e.patientId === DEMO_PATIENT_ID)) {
    const newId = remap(est.id);
    estimates.push({
      ...est,
      id: newId,
      patientId,
      invoiceId: est.invoiceId ? remap(est.invoiceId) : undefined,
      items: est.items.map((i) => ({ ...i, id: uid("li") })),
      code: `P-${String(++estimateSeq).padStart(6, "0")}`,
    });
  }

  for (const inv of invoices.filter((i) => i.patientId === DEMO_PATIENT_ID)) {
    const newId = idMap.get(inv.id) ?? remap(inv.id);
    invoices.push({
      ...inv,
      id: newId,
      patientId,
      estimateId: inv.estimateId
        ? (idMap.get(inv.estimateId) ?? inv.estimateId)
        : undefined,
      items: inv.items.map((i) => ({ ...i, id: uid("li") })),
      code: `F-${String(++invoiceSeq).padStart(6, "0")}`,
    });
  }

  for (const pay of payments.filter((p) => p.patientId === DEMO_PATIENT_ID)) {
    payments.push({
      ...pay,
      id: uid("pay"),
      patientId,
      invoiceId: pay.invoiceId
        ? (idMap.get(pay.invoiceId) ?? pay.invoiceId)
        : undefined,
    });
  }
}

function applyPaymentToInvoice(
  invoice: InvoiceResponse,
  amount: number,
): void {
  invoice.paidAmount = roundMoney(invoice.paidAmount + amount);
  invoice.balance = roundMoney(invoice.total - invoice.paidAmount);
  invoice.status = inferInvoiceStatus(invoice.total, invoice.paidAmount);
  invoice.updatedAt = nowIso();
}

// ─── Public API (misma forma que billingApi) ────────────────────────

async function getPatientLedger(
  patientId: string,
): Promise<PatientLedgerResponse> {
  await delay();
  ensureSeedForPatient(patientId);
  return rebuildLedger(patientId);
}

async function getEstimates(
  params?: BillingQueryParams,
): Promise<PaginatedEstimatesResponse> {
  await delay();
  let list = [...estimates];
  if (params?.patientId) {
    list = list.filter((e) => e.patientId === params.patientId);
  }
  if (params?.status) {
    list = list.filter((e) => e.status === params.status);
  }
  return paginate(list, params);
}

async function getEstimateById(id: string): Promise<EstimateResponse> {
  await delay();
  const found = estimates.find((e) => e.id === id);
  if (!found) throw new Error("Presupuesto no encontrado");
  return found;
}

async function createEstimate(
  data: CreateEstimateRequest,
): Promise<EstimateResponse> {
  await delay();
  const items = toLineItems(data.items);
  const subtotal = calcSubtotal(items);
  const discount = data.discount ?? 0;
  const created: EstimateResponse = {
    id: uid("est"),
    patientId: data.patientId,
    code: `P-${String(++estimateSeq).padStart(6, "0")}`,
    status: data.status ?? "DRAFT",
    treatmentPlanId: data.treatmentPlanId,
    items,
    subtotal,
    discount,
    total: calcDocumentTotal(subtotal, discount),
    currency: data.currency,
    exchangeRate: data.exchangeRate ?? 1,
    validUntil: data.validUntil,
    notes: data.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  estimates.unshift(created);
  return created;
}

async function updateEstimate(
  data: UpdateEstimateRequest,
): Promise<EstimateResponse> {
  await delay();
  const idx = estimates.findIndex((e) => e.id === data.id);
  if (idx < 0) throw new Error("Presupuesto no encontrado");
  const current = estimates[idx];
  if (current.status === "CONVERTED") {
    throw new Error("No se puede editar un presupuesto ya convertido");
  }

  const items = data.items ? toLineItems(data.items) : current.items;
  const subtotal = calcSubtotal(items);
  const discount = data.discount ?? current.discount;

  const updated: EstimateResponse = {
    ...current,
    items,
    subtotal,
    discount,
    total: calcDocumentTotal(subtotal, discount),
    currency: data.currency ?? current.currency,
    exchangeRate: data.exchangeRate ?? current.exchangeRate,
    validUntil: data.validUntil ?? current.validUntil,
    notes: data.notes ?? current.notes,
    updatedAt: nowIso(),
  };
  estimates[idx] = updated;
  return updated;
}

async function updateEstimateStatus(
  id: string,
  data: UpdateEstimateStatusRequest,
): Promise<EstimateResponse> {
  await delay();
  const idx = estimates.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Presupuesto no encontrado");
  const current = estimates[idx];
  if (current.status === "CONVERTED") {
    throw new Error("El presupuesto ya fue convertido a factura");
  }
  const updated: EstimateResponse = {
    ...current,
    status: data.status as EstimateStatus,
    updatedAt: nowIso(),
  };
  estimates[idx] = updated;
  return updated;
}

async function convertEstimate(id: string): Promise<ConvertEstimateResult> {
  await delay();
  const idx = estimates.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Presupuesto no encontrado");
  const estimate = estimates[idx];
  if (estimate.status === "CONVERTED" || estimate.invoiceId) {
    throw new Error("El presupuesto ya fue convertido");
  }
  if (estimate.status === "REJECTED" || estimate.status === "EXPIRED") {
    throw new Error("No se puede convertir un presupuesto rechazado o expirado");
  }

  const invoice: InvoiceResponse = {
    id: uid("inv"),
    patientId: estimate.patientId,
    code: `F-${String(++invoiceSeq).padStart(6, "0")}`,
    status: "ISSUED",
    estimateId: estimate.id,
    treatmentPlanId: estimate.treatmentPlanId,
    items: estimate.items.map((i) => ({ ...i, id: uid(`li-${++lineSeq}`) })),
    subtotal: estimate.subtotal,
    discount: estimate.discount,
    total: estimate.total,
    paidAmount: 0,
    balance: estimate.total,
    currency: estimate.currency,
    exchangeRate: estimate.exchangeRate,
    notes: estimate.notes,
    issuedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  invoices.unshift(invoice);

  const converted: EstimateResponse = {
    ...estimate,
    status: "CONVERTED",
    invoiceId: invoice.id,
    updatedAt: nowIso(),
  };
  estimates[idx] = converted;

  return { estimate: converted, invoice };
}

async function getInvoices(
  params?: BillingQueryParams,
): Promise<PaginatedInvoicesResponse> {
  await delay();
  let list = [...invoices];
  if (params?.patientId) {
    list = list.filter((i) => i.patientId === params.patientId);
  }
  if (params?.status) {
    list = list.filter((i) => i.status === params.status);
  }
  return paginate(list, params);
}

async function getInvoiceById(id: string): Promise<InvoiceResponse> {
  await delay();
  const found = invoices.find((i) => i.id === id);
  if (!found) throw new Error("Factura no encontrada");
  return found;
}

async function createInvoice(
  data: CreateInvoiceRequest,
): Promise<InvoiceResponse> {
  await delay();
  const items = toLineItems(data.items);
  const subtotal = calcSubtotal(items);
  const discount = data.discount ?? 0;
  const total = calcDocumentTotal(subtotal, discount);
  const created: InvoiceResponse = {
    id: uid("inv"),
    patientId: data.patientId,
    code: `F-${String(++invoiceSeq).padStart(6, "0")}`,
    status: "ISSUED",
    estimateId: data.estimateId,
    treatmentPlanId: data.treatmentPlanId,
    items,
    subtotal,
    discount,
    total,
    paidAmount: 0,
    balance: total,
    currency: data.currency,
    exchangeRate: data.exchangeRate ?? 1,
    notes: data.notes,
    dueDate: data.dueDate,
    issuedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  invoices.unshift(created);
  return created;
}

async function updateInvoice(
  data: UpdateInvoiceRequest,
): Promise<InvoiceResponse> {
  await delay();
  const idx = invoices.findIndex((i) => i.id === data.id);
  if (idx < 0) throw new Error("Factura no encontrada");
  const current = invoices[idx];
  if (current.status === "VOID" || current.status === "PAID") {
    throw new Error("No se puede editar una factura anulada o pagada");
  }
  if (current.paidAmount > 0) {
    throw new Error("No se puede editar una factura con pagos registrados");
  }

  const items = data.items ? toLineItems(data.items) : current.items;
  const subtotal = calcSubtotal(items);
  const discount = data.discount ?? current.discount;
  const total = calcDocumentTotal(subtotal, discount);

  const updated: InvoiceResponse = {
    ...current,
    items,
    subtotal,
    discount,
    total,
    balance: roundMoney(total - current.paidAmount),
    status: inferInvoiceStatus(total, current.paidAmount),
    notes: data.notes ?? current.notes,
    dueDate: data.dueDate ?? current.dueDate,
    updatedAt: nowIso(),
  };
  invoices[idx] = updated;
  return updated;
}

async function voidInvoice(id: string): Promise<InvoiceResponse> {
  await delay();
  const idx = invoices.findIndex((i) => i.id === id);
  if (idx < 0) throw new Error("Factura no encontrada");
  const current = invoices[idx];
  if (current.paidAmount > 0) {
    throw new Error("Anula primero los pagos asociados antes de anular la factura");
  }
  const updated: InvoiceResponse = {
    ...current,
    status: "VOID",
    balance: 0,
    updatedAt: nowIso(),
  };
  invoices[idx] = updated;
  return updated;
}

async function getPayments(
  params?: BillingQueryParams,
): Promise<PaginatedPaymentsResponse> {
  await delay();
  let list = [...payments];
  if (params?.patientId) {
    list = list.filter((p) => p.patientId === params.patientId);
  }
  if (params?.from) {
    list = list.filter((p) => p.paidAt.slice(0, 10) >= params.from!);
  }
  if (params?.to) {
    list = list.filter((p) => p.paidAt.slice(0, 10) <= params.to!);
  }
  return paginate(list, params);
}

async function registerPayment(
  data: RegisterPaymentRequest,
): Promise<PaymentResponse> {
  await delay();
  if (data.amount <= 0) throw new Error("El monto del pago debe ser mayor a 0");

  if (data.invoiceId) {
    const invoice = invoices.find((i) => i.id === data.invoiceId);
    if (!invoice) throw new Error("Factura no encontrada");
    if (invoice.status === "VOID") throw new Error("La factura está anulada");
    if (invoice.patientId !== data.patientId) {
      throw new Error("La factura no pertenece a este paciente");
    }
    if (data.amount > invoice.balance + 0.001) {
      throw new Error("El pago supera el saldo pendiente de la factura");
    }
    applyPaymentToInvoice(invoice, data.amount);
  }

  const payment: PaymentResponse = {
    id: uid("pay"),
    patientId: data.patientId,
    invoiceId: data.invoiceId,
    amount: roundMoney(data.amount),
    currency: data.currency,
    exchangeRate: data.exchangeRate ?? 1,
    method: data.method,
    reference: data.reference,
    paidAt: data.paidAt ?? nowIso(),
    notes: data.notes,
    createdAt: nowIso(),
  };
  payments.unshift(payment);
  return payment;
}

async function voidPayment(id: string): Promise<PaymentResponse> {
  await delay();
  const idx = payments.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Pago no encontrado");
  const current = payments[idx];
  if (current.voided) throw new Error("El pago ya está anulado");

  if (current.invoiceId) {
    const invoice = invoices.find((i) => i.id === current.invoiceId);
    if (invoice && invoice.status !== "VOID") {
      invoice.paidAmount = roundMoney(
        Math.max(0, invoice.paidAmount - current.amount),
      );
      invoice.balance = roundMoney(invoice.total - invoice.paidAmount);
      invoice.status = inferInvoiceStatus(invoice.total, invoice.paidAmount);
      invoice.updatedAt = nowIso();
    }
  }

  const updated: PaymentResponse = {
    ...current,
    voided: true,
  };
  payments[idx] = updated;
  return updated;
}

async function getCashSummary(date: string): Promise<CashSummaryResponse> {
  await delay();
  const dayPayments = payments.filter(
    (p) => !p.voided && p.paidAt.slice(0, 10) === date,
  );
  const byMethod: Partial<Record<PaymentMethod, number>> = {};
  let collectedTotal = 0;
  for (const p of dayPayments) {
    collectedTotal = roundMoney(collectedTotal + p.amount);
    byMethod[p.method] = roundMoney((byMethod[p.method] ?? 0) + p.amount);
  }

  const openInvoices = invoices.filter(
    (i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID",
  );
  const pendingTotal = roundMoney(
    openInvoices.reduce((s, i) => s + i.balance, 0),
  );
  const patientsWithBalance = new Set(openInvoices.map((i) => i.patientId)).size;

  return {
    date,
    currency: CLINIC_CURRENCY,
    collectedTotal,
    byMethod,
    pendingTotal,
    patientsWithBalance,
  };
}

async function getReceivables(
  params?: BillingQueryParams,
): Promise<PaginatedReceivablesResponse> {
  await delay();
  const open = invoices.filter(
    (i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID",
  );
  const byPatient = new Map<
    string,
    { balance: number; currency: string; oldestDueDate?: string; invoiceCount: number }
  >();

  for (const inv of open) {
    const prev = byPatient.get(inv.patientId);
    if (!prev) {
      byPatient.set(inv.patientId, {
        balance: inv.balance,
        currency: inv.currency,
        oldestDueDate: inv.dueDate,
        invoiceCount: 1,
      });
    } else {
      prev.balance = roundMoney(prev.balance + inv.balance);
      prev.invoiceCount += 1;
      if (
        inv.dueDate &&
        (!prev.oldestDueDate || inv.dueDate < prev.oldestDueDate)
      ) {
        prev.oldestDueDate = inv.dueDate;
      }
    }
  }

  const entities = Array.from(byPatient.entries()).map(([patientId, data]) => ({
    patientId,
    patientName:
      patientId === DEMO_PATIENT_ID
        ? "Paciente Demo Facturación"
        : `Paciente ${patientId.slice(0, 8)}`,
    ...data,
  }));

  return paginate(entities, params);
}

async function getExchangeRate(
  base: string,
  target: string,
): Promise<ExchangeRateResponse> {
  await delay(80);
  const key = `${base.toUpperCase()}:${target.toUpperCase()}`;
  const rate = exchangeRates[key];
  if (rate === undefined) {
    throw new Error(`Tipo de cambio no disponible para ${base} → ${target}`);
  }
  return {
    base: base.toUpperCase(),
    target: target.toUpperCase(),
    rate,
    asOf: todayYmd(),
  };
}

export const billingMock: BillingApiShape = {
  getPatientLedger,
  getEstimates,
  getEstimateById,
  createEstimate,
  updateEstimate,
  updateEstimateStatus,
  convertEstimate,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  voidInvoice,
  getPayments,
  registerPayment,
  voidPayment,
  getCashSummary,
  getReceivables,
  getExchangeRate,
};

/** ID del paciente demo con datos seed (útil en UI de desarrollo). */
export const BILLING_MOCK_DEMO_PATIENT_ID = DEMO_PATIENT_ID;
