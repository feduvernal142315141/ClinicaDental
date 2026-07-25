# Facturación y Cobros — Spec de integración Backend

> **Estado**: Front implementado (mock). Listo para implementar en `backend-clinic`.
> **Frontend**: rama `feat/billing-cobros` — contratos en `lib/entity/billing`, HTTP en `lib/services/billing/billing.api.ts`
> **Stack backend**: Java + Spring Boot + arquitectura hexagonal
> **Prioridad**: Alta — cierra el ciclo clínico (plan → presupuesto → factura → cobro)
> **Pasarela de pago**: **NO**. Solo registro de cobros (efectivo / POS físico / transferencia)

---

## 0. Resumen para el agente / equipo backend

### Qué es este módulo (en una frase)

Un **libro de cuenta del paciente y de caja de la clínica**: el dinero sigue cobrándose afuera (caja/POS); el sistema anota cargos, pagos y saldos.

### Qué ya hace el frontend

| Pantalla / flujo | Ruta UI | Endpoint que espera |
|---|---|---|
| Cuenta del paciente | `/patients/{id}?tab=cuenta` | `GET /billing/patients/{id}/ledger` |
| Registrar pago | modal en Cuenta / factura | `POST /billing/payments` |
| Nuevo presupuesto | `/billing/estimates/new` | `POST /billing/estimates` |
| Detalle presupuesto + convertir | `/billing/estimates/{id}` | `GET/PATCH …`, `POST …/convert` |
| Nueva factura | `/billing/invoices/new` | `POST /billing/invoices` |
| Recibo imprimible | `/billing/invoices/{id}` | `GET /billing/invoices/{id}`, `GET /billing/payments` |
| Caja + Por cobrar | `/billing` | `GET /billing/cash-summary`, `GET /billing/receivables` |

### Cómo activar el front contra backend real

Hoy el front usa mock si:

```env
NEXT_PUBLIC_BILLING_MOCK=true
```

Cuando los endpoints existan y pasen contrato:

```env
NEXT_PUBLIC_BILLING_MOCK=false
```

**No hace falta cambiar UI**: el conmutador está en `lib/services/billing/billing.service.ts`.

### Principio de dominio

```
Presupuesto (Estimate)  --aceptar/convertir-->  Factura (Invoice)  <--pagos--  Payment
                                                      |
                                                      v
                                              PatientLedger (agregado)
```

- **Estimate** = propuesta (no genera deuda hasta convertirse).
- **Invoice** = cargo / deuda en la cuenta.
- **Payment** = anotación de dinero recibido (no procesa tarjeta).
- `balance = total − paidAmount` lo calcula **siempre el backend** y recalcula `status`.

---

## 1. Contexto de producto

Clinic Flow ya tiene pacientes, agenda, historia clínica, odontograma y **planes de tratamiento** (`/treatment-plans`) con costos. Faltaba el puente al dinero.

El módulo **no** es contabilidad fiscal ni pasarela Stripe. Es:

1. Presupuesto desde plan o ítems manuales.
2. Factura (cargo interno) al aceptar / emitir.
3. Pagos parciales o totales (CASH, CARD_POS, TRANSFER, ADVANCE, OTHER).
4. Cuenta por paciente + caja del día + listado por cobrar.

Multi-moneda: cada documento congela `currency` + `exchangeRate`. La moneda base de la clínica viene de `/clinic/general-settings`.

---

## 2. Permiso JWT (obligatorio)

Añadir autoridad/módulo:

| Campo | Valor |
|---|---|
| `name` / moduleKey | `billing` |
| Claim JWT | `billing-{bitmask}` (igual que `service-15`) |
| Acciones | `CREATE=1`, `EDIT=2`, `DELETE=4`, `BLOCK=8` |

Uso en front:

- `CREATE` → registrar pago, crear presupuesto/factura, convertir
- `EDIT` → editar borradores / marcar enviado
- `BLOCK` → anular factura/pago

El front ya tiene el catálogo UI en `PERMISSIONS.BILLING` (`lib/constants/roles.constants.ts`). Backend debe:

1. Persistir el permiso en el catálogo (`GET /permissions`).
2. Permitir asignarlo a roles.
3. Emitirlo en el claim `module-actions` del JWT.

**Multi-tenant**: todas las entidades llevan `clinicId` del token; nunca mezclar clínicas.

---

## 3. Modelo de datos (sugerido)

Arquitectura hexagonal: estas tablas son **adapters de persistencia**; el dominio no debe filtrar JPA.

### 3.1 `billing_estimates`

```sql
CREATE TABLE billing_estimates (
    id                  VARCHAR(36)    PRIMARY KEY,
    clinic_id           VARCHAR(36)    NOT NULL,
    patient_id          VARCHAR(36)    NOT NULL,
    code                VARCHAR(32)    NOT NULL,          -- P-000123 (único por clínica)
    status              VARCHAR(20)    NOT NULL,          -- DRAFT|SENT|ACCEPTED|REJECTED|EXPIRED|CONVERTED
    treatment_plan_id   VARCHAR(36),
    invoice_id          VARCHAR(36),                      -- set al convertir
    subtotal            DECIMAL(14,2)  NOT NULL,
    discount            DECIMAL(14,2)  NOT NULL DEFAULT 0,
    total               DECIMAL(14,2)  NOT NULL,
    currency            VARCHAR(3)     NOT NULL,          -- ISO-4217
    exchange_rate       DECIMAL(18,8)  NOT NULL DEFAULT 1,
    valid_until         DATE,
    notes               VARCHAR(500),
    created_at          TIMESTAMP      NOT NULL,
    updated_at          TIMESTAMP      NOT NULL,

    CONSTRAINT uq_estimate_code_clinic UNIQUE (clinic_id, code),
    CONSTRAINT fk_estimate_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX idx_estimate_patient ON billing_estimates(clinic_id, patient_id);
CREATE INDEX idx_estimate_status  ON billing_estimates(clinic_id, status);
```

### 3.2 `billing_invoices`

```sql
CREATE TABLE billing_invoices (
    id                  VARCHAR(36)    PRIMARY KEY,
    clinic_id           VARCHAR(36)    NOT NULL,
    patient_id          VARCHAR(36)    NOT NULL,
    code                VARCHAR(32)    NOT NULL,          -- F-000123
    status              VARCHAR(20)    NOT NULL,          -- ISSUED|PARTIALLY_PAID|PAID|VOID
    estimate_id         VARCHAR(36),
    treatment_plan_id   VARCHAR(36),
    subtotal            DECIMAL(14,2)  NOT NULL,
    discount            DECIMAL(14,2)  NOT NULL DEFAULT 0,
    total               DECIMAL(14,2)  NOT NULL,
    paid_amount         DECIMAL(14,2)  NOT NULL DEFAULT 0,
    balance             DECIMAL(14,2)  NOT NULL,          -- denormalizado: total - paid_amount
    currency            VARCHAR(3)     NOT NULL,
    exchange_rate       DECIMAL(18,8)  NOT NULL DEFAULT 1,
    notes               VARCHAR(500),
    issued_at           TIMESTAMP,
    due_date            DATE,
    created_at          TIMESTAMP      NOT NULL,
    updated_at          TIMESTAMP      NOT NULL,

    CONSTRAINT uq_invoice_code_clinic UNIQUE (clinic_id, code),
    CONSTRAINT fk_invoice_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX idx_invoice_patient ON billing_invoices(clinic_id, patient_id);
CREATE INDEX idx_invoice_status  ON billing_invoices(clinic_id, status);
CREATE INDEX idx_invoice_balance ON billing_invoices(clinic_id, balance);
```

### 3.3 `billing_line_items` (polimórfica o dos tablas)

Opción A (recomendada): una tabla con `owner_type` + `owner_id`.

```sql
CREATE TABLE billing_line_items (
    id              VARCHAR(36)    PRIMARY KEY,
    clinic_id       VARCHAR(36)    NOT NULL,
    owner_type      VARCHAR(20)    NOT NULL,          -- ESTIMATE | INVOICE
    owner_id        VARCHAR(36)    NOT NULL,
    service_id      VARCHAR(36),                      -- opcional FK a services
    description     VARCHAR(200)   NOT NULL,
    tooth_ref       VARCHAR(10),                      -- FDI opcional ("16")
    quantity        DECIMAL(12,2)  NOT NULL,
    unit_price      DECIMAL(14,2)  NOT NULL,
    discount        DECIMAL(14,2)  NOT NULL DEFAULT 0,
    total           DECIMAL(14,2)  NOT NULL,          -- qty * unit_price - discount
    sort_order      INT            NOT NULL DEFAULT 0
);

CREATE INDEX idx_line_owner ON billing_line_items(owner_type, owner_id);
```

### 3.4 `billing_payments`

```sql
CREATE TABLE billing_payments (
    id              VARCHAR(36)    PRIMARY KEY,
    clinic_id       VARCHAR(36)    NOT NULL,
    patient_id      VARCHAR(36)    NOT NULL,
    invoice_id      VARCHAR(36),                      -- NULL = abono / anticipo a cuenta
    amount          DECIMAL(14,2)  NOT NULL,
    currency        VARCHAR(3)     NOT NULL,
    exchange_rate   DECIMAL(18,8)  NOT NULL DEFAULT 1,
    method          VARCHAR(20)    NOT NULL,          -- CASH|CARD_POS|TRANSFER|ADVANCE|OTHER
    reference       VARCHAR(80),                      -- voucher POS / # transferencia
    paid_at         TIMESTAMP      NOT NULL,
    received_by     VARCHAR(36),                      -- doctor/user del JWT
    notes           VARCHAR(500),
    voided          BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP      NOT NULL,

    CONSTRAINT fk_payment_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id)
);

CREATE INDEX idx_payment_patient ON billing_payments(clinic_id, patient_id);
CREATE INDEX idx_payment_invoice ON billing_payments(invoice_id);
CREATE INDEX idx_payment_paid_at ON billing_payments(clinic_id, paid_at);
```

### 3.5 Secuencias de correlativo

```sql
CREATE TABLE billing_sequences (
    clinic_id       VARCHAR(36)    NOT NULL,
    doc_type        VARCHAR(20)    NOT NULL,          -- ESTIMATE | INVOICE
    next_value      BIGINT         NOT NULL DEFAULT 1,
    PRIMARY KEY (clinic_id, doc_type)
);
```

Generar `P-000001`, `F-000001` con padding a 6 dígitos (o más si lo necesitan). **Atómico** (lock de fila / `UPDATE … RETURNING`).

### 3.6 Tipo de cambio (mínimo viable)

Puede ser tabla simple o config por clínica:

```sql
CREATE TABLE billing_exchange_rates (
    clinic_id       VARCHAR(36)    NOT NULL,
    base_currency   VARCHAR(3)     NOT NULL,
    target_currency VARCHAR(3)     NOT NULL,
    rate            DECIMAL(18,8)  NOT NULL,
    as_of           DATE           NOT NULL,
    PRIMARY KEY (clinic_id, base_currency, target_currency)
);
```

Si no hay fila, devolver 404 claro; el front muestra error amigable.

---

## 4. Arquitectura hexagonal (sugerencia de paquetes)

Alinear con el estilo actual de `backend-clinic`. Ejemplo:

```
billing/
├── domain/
│   ├── model/          # Estimate, Invoice, Payment, BillingLineItem, enums
│   ├── port/in/        # use cases (CreateEstimateUseCase, RegisterPaymentUseCase, …)
│   ├── port/out/       # EstimateRepository, InvoiceRepository, SequencePort, …
│   └── service/        # domain services: MoneyCalculator, InvoiceStatusPolicy
├── application/
│   └── service/        # orquesta use cases, transacciones
├── adapter/
│   ├── in/web/         # BillingController, DTOs request/response, mappers
│   └── out/persistence/# JPA entities, Spring Data repos, adapters
└── config/             # beans, security matchers
```

### Reglas de capa

| Capa | Debe | No debe |
|---|---|---|
| Domain | invariantes de dinero/estado | conocer Spring/JPA/HTTP |
| Application | `@Transactional`, orquestar puertos | devolver Entity JPA al controller |
| Adapter in | validar DTO, mapear a comando | lógica de negocio |
| Adapter out | mapear dominio ↔ tablas | decidir estados de factura |

### Domain services clave

1. **MoneyCalculator**
   - `lineTotal = qty * unitPrice - discount`
   - `subtotal = Σ lineTotal`
   - `documentTotal = max(0, subtotal - globalDiscount)`
   - Redondeo a **2 decimales** (HALF_UP) — el front asume eso.
2. **InvoiceStatusPolicy**
   - `paidAmount <= 0` → `ISSUED`
   - `0 < paidAmount < total` → `PARTIALLY_PAID`
   - `paidAmount >= total` → `PAID`
   - anulación → `VOID` (solo si `paidAmount == 0` o tras void de pagos)
3. **EstimateLifecycle**
   - editable solo en `DRAFT` (y quizá `SENT` si lo permiten)
   - `convert` solo si status ∈ {`DRAFT`,`SENT`,`ACCEPTED`} y no `CONVERTED`
   - al convertir: crear Invoice `ISSUED`, copiar ítems, set `estimate.invoiceId`, status `CONVERTED`

---

## 5. Contratos HTTP (fuente de verdad del front)

**Base path**: `/billing`  
**Auth**: Bearer JWT en todos  
**Content-Type**: `application/json`  
**Paginación**: `page` **0-based**, respuesta:

```json
{
  "entities": [ /* ... */ ],
  "pagination": { "page": 0, "pageSize": 10, "total": 42 }
}
```

Errores: mismos patrones del resto del backend (`message` / `details` + status). El front usa `handleServiceError`.

### 5.1 Ledger del paciente

```
GET /billing/patients/{patientId}/ledger
```

**200** → `PatientLedgerResponse`:

```json
{
  "patientId": "uuid",
  "currency": "USD",
  "totalCharged": 200.00,
  "totalPaid": 80.00,
  "balance": 120.00,
  "creditBalance": 0.00,
  "estimates": [ /* EstimateResponse[] */ ],
  "invoices": [ /* InvoiceResponse[] no VOID o incluir VOID según política; front muestra no-VOID en mock */ ],
  "payments": [ /* PaymentResponse[] */ ]
}
```

Reglas de agregación:

- `totalCharged` = suma `total` de facturas **no VOID**
- `totalPaid` = suma `amount` de pagos **no voided**
- `balance` = `totalCharged − totalPaid` (>0 debe; <0 a favor)
- `creditBalance` = suma de pagos sin `invoiceId` no voided (anticipos)

### 5.2 Presupuestos (Estimates)

| Método | Path | Body / query | Respuesta |
|---|---|---|---|
| `GET` | `/billing/estimates` | `page`, `pageSize`, `patientId?`, `status?`, `q?` | `PaginatedEstimatesResponse` |
| `GET` | `/billing/estimates/{id}` | — | `EstimateResponse` |
| `POST` | `/billing/estimates` | `CreateEstimateRequest` | `EstimateResponse` (201) |
| `PUT` | `/billing/estimates/{id}` | `UpdateEstimateRequest` (incluye `id`) | `EstimateResponse` |
| `PATCH` | `/billing/estimates/{id}/status` | `{ "status": "SENT" \| "ACCEPTED" \| "REJECTED" \| "EXPIRED" }` | `EstimateResponse` |
| `POST` | `/billing/estimates/{id}/convert` | `{}` | `ConvertEstimateResult` `{ estimate, invoice }` |

**CreateEstimateRequest**

```json
{
  "patientId": "uuid",
  "treatmentPlanId": "uuid?",
  "items": [
    {
      "serviceId": "uuid?",
      "description": "Endodoncia unirradicular",
      "toothRef": "21",
      "quantity": 1,
      "unitPrice": 200,
      "discount": 0
    }
  ],
  "discount": 0,
  "currency": "USD",
  "exchangeRate": 1,
  "validUntil": "2026-08-31",
  "notes": "opcional",
  "status": "DRAFT"
}
```

Backend debe:

- Generar `id` (UUID), `code` (`P-######`), timestamps.
- Calcular `total` de cada ítem y del documento (no confiar ciegamente en totales del client; recalcular).
- Validar `patientId` pertenece a la clínica.

**Convert**:

1. Validar estado convertible.
2. Crear factura con mismos ítems/montos/moneda.
3. Marcar presupuesto `CONVERTED` + `invoiceId`.
4. Responder ambos objetos.

### 5.3 Facturas (Invoices)

| Método | Path | Body / query | Respuesta |
|---|---|---|---|
| `GET` | `/billing/invoices` | `page`, `pageSize`, `patientId?`, `status?`, `q?` | `PaginatedInvoicesResponse` |
| `GET` | `/billing/invoices/{id}` | — | `InvoiceResponse` |
| `POST` | `/billing/invoices` | `CreateInvoiceRequest` | `InvoiceResponse` (201) |
| `PUT` | `/billing/invoices/{id}` | `UpdateInvoiceRequest` | `InvoiceResponse` |
| `PATCH` | `/billing/invoices/{id}/void` | `{}` | `InvoiceResponse` |

**CreateInvoiceRequest** — similar a estimate; al crear:

- `status = ISSUED`
- `paidAmount = 0`, `balance = total`
- `issuedAt = now`
- `code = F-######`

**Update** solo si `paidAmount == 0` y status ≠ `VOID`/`PAID`.

**Void** solo si `paidAmount == 0` (si hay pagos, exigir void de pagos primero). Status → `VOID`, `balance = 0`.

**InvoiceResponse** (campos que el front muestra en el recibo):

```json
{
  "id": "uuid",
  "patientId": "uuid",
  "code": "F-000001",
  "status": "PARTIALLY_PAID",
  "estimateId": "uuid?",
  "treatmentPlanId": "uuid?",
  "items": [ /* BillingLineItem con id y total */ ],
  "subtotal": 200,
  "discount": 0,
  "total": 200,
  "paidAmount": 80,
  "balance": 120,
  "currency": "USD",
  "exchangeRate": 1,
  "notes": null,
  "issuedAt": "2026-07-05T12:00:00.000Z",
  "dueDate": "2026-07-31",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Fechas: ISO-8601 UTC en timestamps; `dueDate` / `validUntil` como `YYYY-MM-DD`.

### 5.4 Pagos

| Método | Path | Body / query | Respuesta |
|---|---|---|---|
| `GET` | `/billing/payments` | `page`, `pageSize`, `patientId?`, `from?`, `to?` | `PaginatedPaymentsResponse` |
| `POST` | `/billing/payments` | `RegisterPaymentRequest` | `PaymentResponse` (201) |
| `PATCH` | `/billing/payments/{id}/void` | `{}` | `PaymentResponse` |

**RegisterPaymentRequest**

```json
{
  "patientId": "uuid",
  "invoiceId": "uuid?",
  "amount": 80,
  "currency": "USD",
  "exchangeRate": 1,
  "method": "CASH",
  "reference": "opcional",
  "paidAt": "2026-07-12T18:00:00.000Z",
  "notes": "opcional"
}
```

Reglas:

1. `amount > 0`.
2. Si hay `invoiceId`:
   - factura existe, misma clínica, mismo paciente, no VOID;
   - `amount <= balance` (tolerancia 0.01);
   - incrementar `paidAmount`, recalcular `balance` y `status`.
3. Si **no** hay `invoiceId`: abono a cuenta (anticipo) → suma a `creditBalance` del ledger.
4. `receivedBy` = userId del JWT.
5. Método `CARD_POS` / `TRANSFER`: `reference` recomendado (no obligatorio en MVP).

**Void payment**:

- Marcar `voided = true`.
- Si tenía `invoiceId`, restar el monto de `paidAmount` y recalcular status/balance.

### 5.5 Caja del día

```
GET /billing/cash-summary?date=YYYY-MM-DD
```

```json
{
  "date": "2026-07-24",
  "currency": "USD",
  "collectedTotal": 80.00,
  "byMethod": {
    "CASH": 80.00,
    "CARD_POS": 0
  },
  "pendingTotal": 120.00,
  "patientsWithBalance": 1
}
```

- `collectedTotal` / `byMethod`: pagos del día (`paid_at` en zona de clínica o UTC documentado) no voided.
- `pendingTotal`: suma `balance` de facturas `ISSUED` + `PARTIALLY_PAID`.
- `patientsWithBalance`: distinct patients con esas facturas.

### 5.6 Por cobrar (receivables)

```
GET /billing/receivables?page=0&pageSize=10&q=
```

```json
{
  "entities": [
    {
      "patientId": "uuid",
      "patientName": "Jorge Ariel Mancha Alvarez",
      "balance": 120.00,
      "currency": "USD",
      "oldestDueDate": "2026-07-31",
      "invoiceCount": 1
    }
  ],
  "pagination": { "page": 0, "pageSize": 10, "total": 1 }
}
```

Agregar por paciente saldos de facturas abiertas. `q` busca por nombre (join patients). Orden sugerido: mayor saldo primero.

### 5.7 Tipo de cambio

```
GET /billing/exchange-rates?base=USD&target=NIO
```

```json
{
  "base": "USD",
  "target": "NIO",
  "rate": 36.5,
  "asOf": "2026-07-24"
}
```

---

## 6. Enums (valores exactos — case sensitive)

### EstimateStatus
`DRAFT` | `SENT` | `ACCEPTED` | `REJECTED` | `EXPIRED` | `CONVERTED`

### InvoiceStatus
`ISSUED` | `PARTIALLY_PAID` | `PAID` | `VOID`

### PaymentMethod
`CASH` | `CARD_POS` | `TRANSFER` | `ADVANCE` | `OTHER`

---

## 7. Seguridad y autorización

| Endpoint | Permiso mínimo sugerido |
|---|---|
| GET ledger / lists / detail | autenticado + acceso al paciente de la clínica; idealmente `billing` cualquier bit o admin |
| POST estimates/invoices/payments, convert | `billing` CREATE |
| PUT estimates/invoices, PATCH status | `billing` EDIT |
| PATCH void invoice/payment | `billing` BLOCK |

Admin de clínica: bypass (igual que otros módulos).

Validar siempre:

- `clinicId` del recurso == clínica del JWT
- `patientId` pertenece a esa clínica
- IDs UUID válidos

---

## 8. Integración con dominios existentes

| Dominio | Uso |
|---|---|
| `patients` | FK + nombre en receivables |
| `treatment-plans` | `treatmentPlanId` opcional al crear estimate/invoice (el front lo manda desde HC) |
| `services` | `serviceId` opcional en line items (catálogo con `cost`) |
| `clinic/general-settings` | moneda base de la clínica para ledger/caja |
| `permissions` / roles | módulo `billing` |

No es obligatorio enriquecer ítems desde el plan en backend en MVP: el front puede mandar un ítem con `description = plan.name` y `unitPrice = plan.totalPrice`. Si más adelante quieren expandir eventos del odontograma a líneas, es una mejora.

---

## 9. Checklist de implementación (orden sugerido)

### Fase A — Fundación
- [ ] Migración Flyway/Liquibase de tablas + secuencias
- [ ] Enums de dominio + MoneyCalculator + InvoiceStatusPolicy
- [ ] Puerto/repositorio Estimate, Invoice, Payment
- [ ] Permiso `billing` en catálogo + seed roles admin

### Fase B — CRUD núcleo
- [ ] Estimates CRUD + status + convert
- [ ] Invoices CRUD + void
- [ ] Payments register + void
- [ ] Ledger agregado

### Fase C — Operación clínica
- [ ] Cash summary
- [ ] Receivables paginado + búsqueda
- [ ] Exchange rates (aunque sea tabla estática)

### Fase D — Hardening
- [ ] Tests unitarios de políticas de dinero/estado
- [ ] Tests de integración de convert + payment parcial
- [ ] Auditoría básica (`received_by`, timestamps)
- [ ] Índices y performance en listados por clínica

### Fase E — Go-live con front
- [ ] Contrato verificado contra `lib/entity/billing/index.ts`
- [ ] Front: `NEXT_PUBLIC_BILLING_MOCK=false`
- [ ] Smoke: crear presupuesto → convertir → pagar parcial → ver por cobrar

---

## 10. Criterios de aceptación (contrato)

1. Crear presupuesto con ítems recalcula totales en servidor.
2. Convertir presupuesto genera factura `ISSUED` con mismo total y marca estimate `CONVERTED`.
3. Pago parcial actualiza `paidAmount`, `balance` y status `PARTIALLY_PAID`.
4. Pago que cubre el total deja `PAID` y `balance = 0`.
5. Pago no puede superar el saldo de la factura.
6. Anular factura con pagos existentes falla con mensaje claro.
7. Ledger del paciente coincide con suma de facturas/pagos.
8. Cash summary del día refleja solo pagos no voided de esa fecha.
9. Receivables lista solo pacientes con saldo > 0.
10. Todo filtrado por `clinicId` del JWT (sin fuga multi-tenant).

---

## 11. Qué NO implementar en MVP

- Pasarela Stripe/PayPal / link de pago
- Factura fiscal / DGI / CFDI
- Cuotas programadas formales (el abono parcial ya cubre el caso informal)
- Inventario ligado a ítems
- Contabilidad general / asientos

---

## 12. Referencias en el frontend (para el agente)

| Artefacto | Ruta |
|---|---|
| Contratos TypeScript | `lib/entity/billing/index.ts` |
| Cliente HTTP real | `lib/services/billing/billing.api.ts` |
| Mock de comportamiento esperado | `lib/services/billing/billing.mock.ts` |
| Conmutador mock/api | `lib/services/billing/billing.service.ts` |
| Helpers de dinero | `lib/utils/billing-currency.ts` |
| Permiso UI | `lib/constants/roles.constants.ts` → `PERMISSIONS.BILLING` |
| Spec similar (feedback) | `docs/development/feedback-backend-spec.md` |

---

## 13. Mensaje listo para pegar al agente de backend

```text
Implementa el módulo Facturación y Cobros en backend-clinic (Java/Spring Boot,
arquitectura hexagonal) siguiendo docs/development/billing-backend-spec.md.

- Base path: /billing
- Sin pasarela de pagos: solo registro CASH | CARD_POS | TRANSFER | ADVANCE | OTHER
- Dominio: Estimate → convert → Invoice ← Payment; PatientLedger agregado
- Recalcular totales y status en servidor (no confiar en el client)
- Multi-tenant por clinicId del JWT
- Permiso JWT module key: "billing" (CREATE/EDIT/DELETE/BLOCK)
- Paginación: page 0-based, shape { entities, pagination: { page, pageSize, total } }
- Congelar currency + exchangeRate en cada documento
- Correlativos P-###### y F-###### por clínica
- Endpoints mínimos: ledger, estimates(+convert), invoices(+void), payments(+void),
  cash-summary, receivables, exchange-rates
- Validar contra lib/entity/billing/index.ts del front (rama feat/billing-cobros)
- Cuando esté listo, el front apaga NEXT_PUBLIC_BILLING_MOCK
```

---

*Documento generado a partir de la implementación front en `feat/billing-cobros` (julio 2026). Si el contrato wire cambia, actualizar este archivo y `lib/entity/billing` en el mismo PR coordinado.*
