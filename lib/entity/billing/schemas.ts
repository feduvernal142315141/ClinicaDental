/**
 * Billing — schemas zod con los mismos límites y mensajes que el backend
 * (`FinanceInputRules` / `FinanceMoney` en backend-clinic).
 *
 * - Requests: validan formularios y llamadas antes de enviarlas.
 * - Responses: en desarrollo se usan para detectar desvíos del contrato (no bloquean).
 */
import { z } from "zod";

export const MAX_AMOUNT = 999_999_999_999.99;
export const MAX_LINES = 200;

/** true si `value` no tiene más de `decimals` decimales (tolerante a ruido de float). */
export function hasMaxDecimals(value: number, decimals: number): boolean {
  if (!Number.isFinite(value)) return false;
  const factor = 10 ** decimals;
  const scaled = value * factor;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

interface AmountOptions {
  label: string;
  /** true = > 0 ; false = >= 0 */
  positive?: boolean;
}

/** Monto o cantidad con 2 decimales como máximo. */
export function amountSchema({ label, positive = false }: AmountOptions) {
  return z
    .number({
      required_error: `${label} es obligatorio.`,
      invalid_type_error: `${label} es obligatorio.`,
    })
    .refine((v) => (positive ? v > 0 : v >= 0), {
      message: `${label} ${positive ? "debe ser mayor a 0." : "no puede ser negativo."}`,
    })
    .refine((v) => hasMaxDecimals(v, 2), {
      message: `${label} admite como máximo 2 decimales.`,
    })
    .refine((v) => v <= MAX_AMOUNT, { message: `${label} supera el máximo permitido.` });
}

/** Tasa de cambio: > 0 y hasta 8 decimales. */
export const exchangeRateValueSchema = z
  .number({ invalid_type_error: "La tasa es obligatoria." })
  .refine((v) => v > 0, { message: "La tasa debe ser mayor a 0." })
  .refine((v) => hasMaxDecimals(v, 8) && v < 1e10, {
    message: "La tasa admite hasta 10 enteros y 8 decimales.",
  });

export const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "La moneda debe ser un código ISO 4217 de 3 letras (p. ej. NIO, USD).");

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function textSchema(label: string, max: number) {
  return z
    .string()
    .max(max, `${label} admite como máximo ${max} caracteres.`)
    .refine((v) => !CONTROL_CHARS.test(v), {
      message: `${label} contiene caracteres no permitidos.`,
    });
}

function optionalText(label: string, max: number) {
  return textSchema(label, max)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined));
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD.");

// ─── Líneas ─────────────────────────────────────────────────────────

export const lineItemInputSchema = z
  .object({
    serviceId: z.string().optional(),
    description: textSchema("La descripción", 200).refine((v) => v.trim().length > 0, {
      message: "La descripción es obligatoria.",
    }),
    toothRef: optionalText("La pieza", 20),
    quantity: amountSchema({ label: "La cantidad", positive: true }),
    unitPrice: amountSchema({ label: "El precio" }),
    discount: amountSchema({ label: "El descuento" }).optional(),
  })
  .superRefine((line, ctx) => {
    const gross = Math.round(line.quantity * line.unitPrice * 100) / 100;
    if ((line.discount ?? 0) > gross + 1e-9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discount"],
        message: "El descuento de la línea supera su importe.",
      });
    }
  });

export const lineItemsSchema = z
  .array(lineItemInputSchema)
  .min(1, "Agrega al menos una línea.")
  .max(MAX_LINES, `Un documento admite como máximo ${MAX_LINES} líneas.`);

export const reasonSchema = z
  .string()
  .trim()
  .min(5, "El motivo debe tener al menos 5 caracteres.")
  .max(500, "El motivo admite como máximo 500 caracteres.");

export const reasonRequestSchema = z.object({ reason: reasonSchema });

// ─── Requests ───────────────────────────────────────────────────────

export const createEstimateRequestSchema = z.object({
  patientId: z.string().min(1, "El paciente es obligatorio."),
  treatmentPlanId: z.string().optional(),
  items: lineItemsSchema,
  discount: amountSchema({ label: "El descuento" }).optional(),
  currency: currencyCodeSchema.optional(),
  exchangeRate: exchangeRateValueSchema.optional(),
  validUntil: isoDateSchema.optional(),
  notes: optionalText("Las notas", 500),
  status: z.enum(["DRAFT", "SENT"]).optional(),
});

export const updateEstimateRequestSchema = createEstimateRequestSchema
  .omit({ patientId: true, treatmentPlanId: true, status: true })
  .partial();

export const createInvoiceRequestSchema = z
  .object({
    patientId: z.string().min(1, "El paciente es obligatorio."),
    estimateId: z.string().optional(),
    treatmentPlanId: z.string().optional(),
    items: z.array(lineItemInputSchema).max(MAX_LINES).optional(),
    chargeIds: z.array(z.string()).optional(),
    discount: amountSchema({ label: "El descuento" }).optional(),
    currency: currencyCodeSchema.optional(),
    exchangeRate: exchangeRateValueSchema.optional(),
    notes: optionalText("Las notas", 500),
    dueDate: isoDateSchema.optional(),
  })
  .refine((v) => (v.items?.length ?? 0) + (v.chargeIds?.length ?? 0) > 0, {
    message: "Agrega al menos una línea.",
    path: ["items"],
  });

export const updateInvoiceRequestSchema = z.object({
  items: lineItemsSchema.optional(),
  discount: amountSchema({ label: "El descuento" }).optional(),
  notes: optionalText("Las notas", 500),
  dueDate: isoDateSchema.optional(),
});

export const paymentMethodSchema = z.enum(["CASH", "CARD_POS", "TRANSFER", "ADVANCE", "OTHER"]);
export const refundMethodSchema = z.enum(["CASH", "CARD_POS", "TRANSFER", "OTHER"]);

export const registerPaymentRequestSchema = z.object({
  patientId: z.string().min(1, "El paciente es obligatorio."),
  invoiceId: z.string().optional(),
  amount: amountSchema({ label: "El monto", positive: true }),
  currency: currencyCodeSchema,
  exchangeRate: exchangeRateValueSchema.optional(),
  method: paymentMethodSchema,
  reference: optionalText("La referencia", 80),
  paidAt: z.string().optional(),
  notes: optionalText("Las notas", 500),
});

export const refundRequestSchema = z.object({
  amount: amountSchema({ label: "El monto", positive: true }),
  method: refundMethodSchema,
  reason: reasonSchema,
});

export const createChargeRequestSchema = z.object({
  patientId: z.string().min(1, "El paciente es obligatorio."),
  serviceId: z.string().optional(),
  description: textSchema("La descripción", 200).refine((v) => v.trim().length > 0, {
    message: "La descripción es obligatoria.",
  }),
  toothRef: optionalText("La pieza", 20),
  quantity: amountSchema({ label: "La cantidad", positive: true }),
  unitPrice: amountSchema({ label: "El precio" }),
  performedAt: z.string().optional(),
});

export const openCashRequestSchema = z.object({
  openingFloat: amountSchema({ label: "El fondo inicial" }),
  notes: optionalText("Las notas", 500),
});

export const closeCashRequestSchema = z.object({
  countedCash: amountSchema({ label: "El efectivo contado" }),
  notes: optionalText("Las notas", 500),
  version: z.number().int().nonnegative(),
});

export const setExchangeRateRequestSchema = z.object({
  target: currencyCodeSchema,
  rate: exchangeRateValueSchema,
  asOf: z.string().optional(),
});

export const updateFinanceSettingsRequestSchema = z.object({
  baseCurrency: currencyCodeSchema.nullable(),
  chargePolicy: z.enum(["OFF", "SUGGEST", "AUTO"]),
  allowAdvances: z.boolean(),
  requireCashSession: z.boolean(),
  maxDiscountPercent: z
    .number({ invalid_type_error: "El descuento máximo es obligatorio." })
    .min(0, "El descuento máximo no puede ser negativo.")
    .max(100, "El descuento máximo no puede superar 100%.")
    .refine((v) => hasMaxDecimals(v, 2), {
      message: "El descuento máximo admite como máximo 2 decimales.",
    }),
  version: z.number().int().nonnegative(),
});

// ─── Responses (verificación de contrato en desarrollo) ─────────────

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

export const lineItemResponseSchema = z.object({
  id: z.string(),
  serviceId: nullableString,
  serviceCode: nullableString,
  description: z.string(),
  toothRef: nullableString,
  quantity: z.number(),
  unitPrice: z.number(),
  discount: z.number(),
  total: z.number(),
  chargeId: nullableString,
});

export const estimateResponseSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  patientName: nullableString,
  code: z.string(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"]),
  treatmentPlanId: nullableString,
  items: z.array(lineItemResponseSchema),
  subtotal: z.number(),
  discount: z.number(),
  total: z.number(),
  currency: z.string(),
  exchangeRate: z.number(),
  validUntil: nullableString,
  invoiceId: nullableString,
  notes: nullableString,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});

export const invoiceResponseSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  patientName: nullableString,
  code: z.string(),
  documentType: z.literal("RECEIPT"),
  fiscal: z.literal(false),
  status: z.enum(["ISSUED", "PARTIALLY_PAID", "PAID", "VOID"]),
  estimateId: nullableString,
  treatmentPlanId: nullableString,
  items: z.array(lineItemResponseSchema),
  subtotal: z.number(),
  discount: z.number(),
  total: z.number(),
  paidAmount: z.number(),
  balance: z.number(),
  currency: z.string(),
  exchangeRate: z.number(),
  notes: nullableString,
  issuedAt: z.string(),
  dueDate: nullableString,
  voidReason: nullableString,
  voidedAt: nullableString,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
});

export const paymentResponseSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: nullableString,
  invoiceId: nullableString,
  amount: z.number(),
  currency: z.string(),
  exchangeRate: z.number(),
  appliedAmount: nullableNumber,
  refundedAmount: z.number(),
  method: paymentMethodSchema,
  reference: nullableString,
  paidAt: z.string(),
  receivedBy: nullableString,
  notes: nullableString,
  voided: z.boolean(),
  voidReason: nullableString,
  cashSessionId: nullableString,
  createdAt: z.string(),
  version: z.number(),
});

export const refundResponseSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  patientId: z.string(),
  amount: z.number(),
  currency: z.string(),
  appliedAmount: nullableNumber,
  method: refundMethodSchema,
  reason: z.string(),
  refundedAt: z.string(),
  refundedBy: nullableString,
  cashSessionId: nullableString,
});

export const chargeResponseSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: nullableString,
  sourceType: z.enum(["APPOINTMENT", "MANUAL"]),
  sourceId: nullableString,
  doctorId: nullableString,
  serviceId: nullableString,
  serviceCode: nullableString,
  description: z.string(),
  toothRef: nullableString,
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
  currency: z.string(),
  status: z.enum(["PENDING", "BILLED", "DISMISSED"]),
  invoiceId: nullableString,
  dismissReason: nullableString,
  performedAt: z.string(),
  createdAt: z.string(),
  version: z.number(),
});

export const cashSessionResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["OPEN", "CLOSED"]),
  currency: z.string(),
  openingFloat: z.number(),
  cashIn: z.number(),
  cashOut: z.number(),
  expectedCash: z.number(),
  countedCash: nullableNumber,
  difference: nullableNumber,
  openedBy: z.string(),
  openedAt: z.string(),
  closedBy: nullableString,
  closedAt: nullableString,
  otherCurrencies: z.record(z.number()),
  notes: nullableString,
  version: z.number(),
});

export const patientLedgerResponseSchema = z.object({
  patientId: z.string(),
  currency: z.string(),
  totalCharged: z.number(),
  totalPaid: z.number(),
  balance: z.number(),
  creditBalance: z.number(),
  estimates: z.array(estimateResponseSchema),
  invoices: z.array(invoiceResponseSchema),
  payments: z.array(paymentResponseSchema),
  pendingCharges: z.array(chargeResponseSchema),
});

export const financeSettingsSchema = z.object({
  baseCurrency: z.string(),
  baseCurrencyConfigured: z.boolean(),
  chargePolicy: z.enum(["OFF", "SUGGEST", "AUTO"]),
  allowAdvances: z.boolean(),
  requireCashSession: z.boolean(),
  maxDiscountPercent: z.number(),
  version: z.number(),
});

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    entities: z.array(item),
    pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
  });
}
