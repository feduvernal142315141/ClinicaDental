# Informe del Módulo Odontograma: Endpoints, Modelos y Guía de Integración Frontend

Este informe describe la implementación backend del módulo de **Odontograma** con su modelo híbrido JSONB, incluyendo todos los endpoints REST disponibles, los shapes de request/response, validaciones, manejo de errores, autenticación requerida y consideraciones clave para la integración desde el frontend.

---

## Visión General de la Arquitectura

- **Modelo de datos**: Híbrido JSONB — el frontend envía el estado completo del odontograma como un objeto JSON y el backend lo almacena tal cual en una columna `JSONB` de PostgreSQL.
- **Cero diffs backend**: El backend no itera diente por diente. Recibe el snapshot completo, lo graba como estado actual y deposita una copia inmutable en la tabla de historial.
- **Lectura O(1)**: Un solo `GET` retorna el objeto completo listo para hidratar el store Zustand.
- **Planes de tratamiento**: Entidad relacional separada que referencia eventos clínicos del JSON vía array de UUIDs.

### Tablas de Base de Datos

| Tabla | Propósito |
|---|---|
| `patient_odontograms` | Estado actual (fotografía viva) del odontograma por paciente — **1 fila por paciente** |
| `odontogram_history` | Log inmutable append-only de snapshots por visita (auditoría/viaje en el tiempo) |
| `treatment_plans` | Planes de tratamiento con su propia tabla transaccional |

---

## Autenticación y Permisos

Todos los endpoints requieren:

- **Header**: `Authorization: Bearer <accessToken>`
- **Permiso requerido**: `odontogram` — el usuario autenticado debe tener la autoridad `odontogram` asignada a su rol.

El backend valida esto con `@PreAuthorize(hasAuthority('odontogram'))`.

---

## Endpoints del Odontograma

Base URL: `{API_BASE_URL}/odontograms`

### 1. Guardar Odontograma (Upsert)

Guarda el estado completo del odontograma. Ejecuta en una sola transacción:
1. Inserta snapshot inmutable en `odontogram_history`
2. Upsert del estado actual en `patient_odontograms`

| Propiedad | Valor |
|---|---|
| **Método** | `PUT` |
| **URL** | `/odontograms` |
| **Content-Type** | `application/json` |
| **Status éxito** | `200 OK` |
| **Respuesta éxito** | `true` |

#### Request Body

```jsonc
{
  "patientId": "14760845-ee28-4496-9a56-2ecc81b15af2",   // UUID — requerido
  "visitId": "visit-uuid",                                 // UUID — opcional (id de la cita/visita)
  "authorId": "doctor-uuid",                               // UUID — requerido (id del doctor)
  "clinicId": "clinic-uuid",                               // UUID — requerido
  "version": 2,                                            // int — requerido (≥ 1)
  "state": "{\"teeth\": [...], \"clinicalEvents\": [...]}" // String JSON — requerido
}
```

> **⚠️ Importante**: El campo `state` es un **string JSON** que contiene el objeto completo con `teeth` y `clinicalEvents` tal como lo serializa el adapter del store Zustand. El backend lo almacena textualmente sin parsearlo.

#### Validaciones del Backend

| Campo | Regla | Mensaje de error |
|---|---|---|
| `patientId` | No nulo | "El id del paciente es requerido." |
| `authorId` | No nulo | "El id del autor (doctor) es requerido." |
| `clinicId` | No nulo | "El id de la clínica es requerido." |
| `version` | ≥ 1 | "La versión debe ser mayor o igual a 1." |
| `state` | No nulo ni vacío | "El estado (state) del odontograma es requerido." |
| `patientId` | Debe existir en BD | "Paciente con UUID {id} no existe." (404) |

#### Ejemplo de uso

```typescript
// Desde el adapter de Zustand
const payload = {
  patientId: patient.id,
  visitId: currentVisit?.id ?? null,
  authorId: loggedDoctor.id,
  clinicId: loggedDoctor.clinicId,
  version: currentVersion + 1,
  state: JSON.stringify({ teeth, clinicalEvents })
};

await axios.put('/odontograms', payload);
```

---

### 2. Obtener Odontograma Actual de un Paciente

Retorna el estado actual (fotografía viva) del odontograma. Si el paciente no tiene odontograma aún, retorna `null`.

| Propiedad | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `/odontograms/patient/{patientId}` |
| **Path Params** | `patientId` (UUID) |
| **Status éxito** | `200 OK` |

#### Response Body

```jsonc
{
  "id": "uuid-del-registro",
  "patientId": "14760845-ee28-4496-9a56-2ecc81b15af2",
  "version": 2,
  "state": "{\"teeth\": [...], \"clinicalEvents\": [...]}",  // String JSON
  "updatedAt": "2026-03-09T19:19:48.105+00:00"
}
// O null si no existe aún
```

> **💡 Tip para el front**: Al recibir la respuesta, parsear `state` con `JSON.parse(response.state)` para hidratar el store Zustand.

#### Ejemplo de consumo

```typescript
const response = await axios.get(`/odontograms/patient/${patientId}`);
if (response.data) {
  const { teeth, clinicalEvents } = JSON.parse(response.data.state);
  store.setState({ teeth, clinicalEvents, version: response.data.version });
}
```

---

### 3. Obtener Historial del Odontograma (Paginado)

Retorna la línea de tiempo de snapshots inmutables del odontograma para un paciente dado. Útil para funcionalidades de "viaje en el tiempo".

| Propiedad | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `/odontograms/patient/{patientId}/history` |
| **Path Params** | `patientId` (UUID) |
| **Query Params** | `filters`, `orders`, `page`, `pageSize` |
| **Status éxito** | `200 OK` |

#### Query Parameters

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `filters` | `string[]` | — | Filtros opcionales (formato: `campo__operador__valor`) |
| `orders` | `string[]` | — | Ordenamiento (formato: `campo__ASC` o `campo__DESC`) |
| `page` | `int` | `0` | Número de página (0-indexed) |
| `pageSize` | `int` | `100` | Tamaño de página (máx. 100) |

#### Response Body

```jsonc
{
  "entities": [
    {
      "id": "snapshot-uuid",
      "patientId": "14760845-ee28-4496-9a56-2ecc81b15af2",
      "visitId": "visit-uuid",
      "authorId": "doctor-uuid",
      "clinicId": "clinic-uuid",
      "version": 2,
      "state": "{\"teeth\": [...], \"clinicalEvents\": [...]}",
      "createdAt": "2026-03-09T19:19:48.105+00:00"
    }
    // ... más snapshots
  ],
  "pagination": {
    "page": 0,
    "pageSize": 10,
    "total": 25
  }
}
```

#### Ejemplo — Listar últimas 10 versiones ordenadas por fecha descendente

```typescript
const response = await axios.get(
  `/odontograms/patient/${patientId}/history`,
  { params: { page: 0, pageSize: 10, orders: ['createdAt__DESC'] } }
);
```

---

## Endpoints de Planes de Tratamiento

Base URL: `{API_BASE_URL}/treatment-plans`

### 4. Crear Plan de Tratamiento

| Propiedad | Valor |
|---|---|
| **Método** | `POST` |
| **URL** | `/treatment-plans` |
| **Content-Type** | `application/json` |
| **Status éxito** | `201 Created` |
| **Respuesta éxito** | UUID del plan creado |

#### Request Body

```jsonc
{
  "patientId": "14760845-ee28-4496-9a56-2ecc81b15af2",  // UUID — requerido
  "name": "Restauración sector posterior",                // string — requerido
  "description": "Plan completo para piezas 16, 17",     // string — opcional
  "totalPrice": 1500.00,                                  // decimal — opcional
  "eventIds": "[\"event-uuid-1\", \"event-uuid-2\"]"     // String JSON array — opcional
}
```

> **⚠️ Nota**: `eventIds` es un **string JSON** con un array de UUIDs que apuntan a los `id` de los `clinicalEvents` que viven dentro del `state` JSONB del odontograma. Si no se envía, se inicializa como `"[]"`.

#### Validaciones

| Campo | Regla | Mensaje |
|---|---|---|
| `patientId` | No nulo | "El id del paciente es requerido." |
| `name` | No nulo ni vacío | "El nombre del plan de tratamiento es requerido." |
| `patientId` | Debe existir | "Paciente con UUID {id} no existe." (404) |

#### Respuesta éxito

```json
"a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

### 5. Actualizar Plan de Tratamiento

| Propiedad | Valor |
|---|---|
| **Método** | `PUT` |
| **URL** | `/treatment-plans` |
| **Content-Type** | `application/json` |
| **Status éxito** | `200 OK` |
| **Respuesta éxito** | `true` |

#### Request Body

```jsonc
{
  "id": "plan-uuid",                                       // UUID — requerido
  "name": "Restauración sector posterior (actualizado)",   // string — requerido
  "description": "Descripción actualizada",                // string — opcional
  "status": "completed",                                   // string — opcional ("active", "completed", "cancelled")
  "totalPrice": 1800.00,                                   // decimal — opcional
  "eventIds": "[\"event-uuid-1\", \"event-uuid-3\"]"      // String JSON array — opcional
}
```

#### Validaciones

| Campo | Regla | Mensaje |
|---|---|---|
| `id` | No nulo | "El id del plan de tratamiento es requerido." |
| `name` | No nulo ni vacío | "El nombre del plan de tratamiento es requerido." |
| `status` | Si se envía, debe ser válido | "El estado del plan no es válido. Valores permitidos: active, completed, cancelled." |
| `id` | Debe existir en BD | "Plan de tratamiento con UUID {id} no existe." (404) |

---

### 6. Cancelar Plan de Tratamiento

| Propiedad | Valor |
|---|---|
| **Método** | `PATCH` |
| **URL** | `/treatment-plans/{id}/cancel` |
| **Path Params** | `id` (UUID) |
| **Status éxito** | `200 OK` |
| **Respuesta éxito** | `true` |

#### Validaciones

| Condición | Mensaje |
|---|---|
| `id` nulo | "El id del plan de tratamiento es requerido." |
| Plan no existe | "Plan de tratamiento con UUID {id} no existe." (404) |
| Plan ya cancelado | "El plan de tratamiento ya se encuentra cancelado." (400) |

---

### 7. Obtener Plan de Tratamiento por ID

| Propiedad | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `/treatment-plans/{id}` |
| **Path Params** | `id` (UUID) |
| **Status éxito** | `200 OK` |

#### Response Body

```jsonc
{
  "id": "plan-uuid",
  "patientId": "14760845-ee28-4496-9a56-2ecc81b15af2",
  "name": "Restauración sector posterior",
  "description": "Plan completo para piezas 16, 17",
  "status": "active",          // "active" | "completed" | "cancelled"
  "totalPrice": 1500.00,
  "eventIds": "[\"event-uuid-1\", \"event-uuid-2\"]",  // String JSON array
  "createdAt": "2026-03-09T19:19:48.105+00:00",
  "updatedAt": "2026-03-09T19:19:48.105+00:00",
  "active": true
}
// O null si no existe
```

---

### 8. Listar Planes de Tratamiento por Paciente (Paginado)

| Propiedad | Valor |
|---|---|
| **Método** | `GET` |
| **URL** | `/treatment-plans/patient/{patientId}` |
| **Path Params** | `patientId` (UUID) |
| **Query Params** | `filters`, `orders`, `page`, `pageSize` |
| **Status éxito** | `200 OK` |

#### Response Body

```jsonc
{
  "entities": [
    {
      "id": "plan-uuid",
      "patientId": "...",
      "name": "...",
      "description": "...",
      "status": "active",
      "totalPrice": 1500.00,
      "eventIds": "[...]",
      "createdAt": "...",
      "updatedAt": "...",
      "active": true
    }
  ],
  "pagination": {
    "page": 0,
    "pageSize": 10,
    "total": 3
  }
}
```

---

## Resumen de Endpoints

| # | Método | URL | Descripción | Status |
|---|---|---|---|---|
| 1 | `PUT` | `/odontograms` | Guardar estado completo del odontograma | `200` |
| 2 | `GET` | `/odontograms/patient/{patientId}` | Obtener estado actual | `200` |
| 3 | `GET` | `/odontograms/patient/{patientId}/history` | Historial de snapshots (paginado) | `200` |
| 4 | `POST` | `/treatment-plans` | Crear plan de tratamiento | `201` |
| 5 | `PUT` | `/treatment-plans` | Actualizar plan de tratamiento | `200` |
| 6 | `PATCH` | `/treatment-plans/{id}/cancel` | Cancelar plan de tratamiento | `200` |
| 7 | `GET` | `/treatment-plans/{id}` | Obtener plan por ID | `200` |
| 8 | `GET` | `/treatment-plans/patient/{patientId}` | Listar planes por paciente (paginado) | `200` |

---

## Manejo de Errores

Todos los endpoints retornan el mismo shape de error estándar del backend:

```jsonc
{
  "code": 400,          // HTTP status code (400, 404, 401, 403, 500)
  "message": "Mensaje legible para el usuario",
  "details": "Detalle técnico del error"
}
```

### Códigos de error comunes

| Código | Significado | Cuándo ocurre |
|---|---|---|
| `400` | Bad Request | Validaciones fallidas (campos requeridos, formato inválido, status no válido) |
| `401` | Unauthorized | Token expirado o ausente |
| `403` | Forbidden | Usuario no tiene permiso `odontogram` |
| `404` | Not Found | Paciente o plan de tratamiento no existe |

---

## Estructura del JSON `state` del Odontograma

El campo `state` (String JSON) debe contener exactamente la siguiente estructura. El backend lo almacena y retorna textualmente:

```jsonc
{
  "teeth": [
    {
      "number": 17,                       // int — número de pieza dental
      "globalStatus": "endodontic",       // string — estado global del diente
      "treatments": [],                   // array — tratamientos aplicados
      "surfaceTreatments": [],            // array — tratamientos por superficie
      "surfaceConditions": [],            // array — condiciones por superficie
      "history": []                       // array — historial del diente
    }
    // ... 32 dientes (notación FDI)
  ],
  "clinicalEvents": [
    {
      "id": "77f9c5e6-e69c-4a02-91f9-117bfb97d8c3",  // UUID string — identificador único
      "toothNumber": 17,                                // int
      "surfaces": ["oclusal"],                          // string[]
      "level": "surface",                               // "surface" | "tooth" | "global"
      "type": "diagnosis",                              // string — tipo de evento
      "status": "open",                                 // string — estado del evento
      "severity": 6,                                    // int — severidad
      "icdasScore": 6,                                  // int — score ICDAS
      "notes": "ICDAS 6"                               // string — notas clínicas
    }
    // ... más eventos
  ]
}
```

> **🔑 Regla clave**: El frontend es dueño de la estructura del JSON. Añadir nuevas propiedades a `teeth` o `clinicalEvents` (ej: sangrado gingival, movilidad) **no requiere migraciones de BD**. Solo se actualiza el tipado TypeScript y se guarda automáticamente.

---

## Flujo de Integración Recomendado

### Al abrir la ficha del paciente

```
1. GET /odontograms/patient/{patientId}
   → Si hay data: JSON.parse(state) → hidratar Zustand store
   → Si null: inicializar store con estado vacío (32 dientes limpios)
```

### Al presionar "Guardar"

```
1. Serializar store completo: JSON.stringify({ teeth, clinicalEvents })
2. Incrementar version
3. PUT /odontograms con el payload completo
   → El backend guarda snapshot en historial automáticamente
```

### Para la línea de tiempo / historial

```
1. GET /odontograms/patient/{patientId}/history?page=0&pageSize=20&orders=createdAt__DESC
2. Cada entry tiene su propio "state" → se puede renderizar cualquier versión pasada
```

### Para planes de tratamiento

```
1. GET /treatment-plans/patient/{patientId} → listar planes del paciente
2. POST /treatment-plans → crear nuevo plan vinculando clinicalEvent IDs
3. PUT /treatment-plans → actualizar nombre, descripción, precio, eventIds, status
4. PATCH /treatment-plans/{id}/cancel → cancelar plan
```

---

## Enum `PlanStatus` — Valores Válidos

| Valor | Descripción |
|---|---|
| `active` | Plan activo en curso |
| `completed` | Plan completado satisfactoriamente |
| `cancelled` | Plan cancelado |

---

## Archivos Backend de Referencia

### Controllers
- [OdontogramController.java](src/main/java/com/kodewave/clinic/backend/presentation/controllers/odontogramControllers/OdontogramController.java)
- [TreatmentPlanController.java](src/main/java/com/kodewave/clinic/backend/presentation/controllers/odontogramControllers/TreatmentPlanController.java)

### Commands (Escritura)
- [SaveOdontogramCommand](src/main/java/com/kodewave/clinic/backend/application/commands/odontogramCommands/save/SaveOdontogramCommand.java)
- [CreateTreatmentPlanCommand](src/main/java/com/kodewave/clinic/backend/application/commands/odontogramCommands/treatmentPlan/create/CreateTreatmentPlanCommand.java)
- [UpdateTreatmentPlanCommand](src/main/java/com/kodewave/clinic/backend/application/commands/odontogramCommands/treatmentPlan/update/UpdateTreatmentPlanCommand.java)
- [CancelTreatmentPlanCommand](src/main/java/com/kodewave/clinic/backend/application/commands/odontogramCommands/treatmentPlan/cancel/CancelTreatmentPlanCommand.java)

### Queries (Lectura)
- [GetOdontogramQuery](src/main/java/com/kodewave/clinic/backend/application/queries/odontogramQueries/get/GetOdontogramQuery.java)
- [GetOdontogramHistoryQuery](src/main/java/com/kodewave/clinic/backend/application/queries/odontogramQueries/getHistory/GetOdontogramHistoryQuery.java)
- [GetTreatmentPlanQuery](src/main/java/com/kodewave/clinic/backend/application/queries/odontogramQueries/getTreatmentPlan/GetTreatmentPlanQuery.java)
- [GetAllTreatmentPlansQuery](src/main/java/com/kodewave/clinic/backend/application/queries/odontogramQueries/getAllTreatmentPlans/GetAllTreatmentPlansQuery.java)

### Domain
- [Odontogram Entity](src/main/java/com/kodewave/clinic/backend/domain/entities/odontogram/Odontogram.java)
- [OdontogramHistory Entity](src/main/java/com/kodewave/clinic/backend/domain/entities/odontogram/OdontogramHistory.java)
- [TreatmentPlan Entity](src/main/java/com/kodewave/clinic/backend/domain/entities/odontogram/TreatmentPlan.java)
- [PlanStatus Enum](src/main/java/com/kodewave/clinic/backend/domain/enums/PlanStatus.java)

---

## Consideraciones Importantes para el Frontend

1. **`state` es un String JSON, no un objeto**: El backend lo recibe y retorna como `string`. El front debe hacer `JSON.stringify()` al enviar y `JSON.parse()` al recibir.

2. **`eventIds` también es String JSON**: Mismo tratamiento. Es un array de UUIDs serializado como string: `"[\"uuid-1\", \"uuid-2\"]"`.

3. **Versionamiento optimista**: El campo `version` debe ser incrementado por el frontend en cada guardado. Esto permite detectar conflictos si dos doctores editan simultáneamente.

4. **El permiso `odontogram` debe existir en el rol del usuario**: Si el token JWT no incluye esta autoridad, todos los endpoints retornarán `403 Forbidden`.

5. **Filtros y paginación**: Los endpoints de listado soportan el mismo sistema de filtros que el resto de la API (`campo__operador__valor`). Ejemplo: `status__EQ__active`.

6. **Extensibilidad sin migración**: Agregar campos nuevos al JSON del odontograma (ej: movilidad dental, recesión gingival) solo requiere actualizar el tipado TypeScript. No se necesitan cambios en el backend ni migraciones de base de datos.

---

Este informe cubre todos los endpoints y contratos necesarios para la integración del módulo de Odontograma desde el frontend.
