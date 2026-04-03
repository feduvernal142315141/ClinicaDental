# Informe Frontend: Servicios, Odontograma y Citas

Este documento resume los cambios recientes que impactan al frontend en los módulos de **services**, **appointments**, **odontogram** y **treatment plans**.
Está guiado por [ODONTOGRAM_API.md](./ODONTOGRAM_API.md), pero enfocado en lo que el equipo frontend necesita para integrar sin ambigüedades.

---

## Resumen Ejecutivo

### 1. El catálogo de servicios ahora tiene metadata para odontograma

Los servicios ya no son solo `code`, `name`, `type` y `cost`. Ahora también incluyen:

- `odontogramEnabled`: define si el servicio puede usarse dentro del odontograma.
- `odontogramSymbolMode`: define cómo debe representarse visualmente en UI.
- `symbolPublicId`: identificador opcional del asset.
- `symbolUrl`: URL del símbolo cuando el modo es `ASSET`.
- `symbolText`: texto del símbolo cuando el modo es `TEXT`.

### 2. Las citas pueden quedar vinculadas a un servicio

Al crear una cita se puede enviar un `serviceId`. Si existe y está activo, el backend guarda un snapshot del servicio dentro de la cita:

- `serviceId`
- `serviceCode`
- `serviceName`
- `serviceCost`

Esto permite que frontend renderice el servicio de la cita sin depender del estado actual del catálogo.

### 3. Los planes de tratamiento ya no deberían calcular precio en frontend

Aunque el request de crear/actualizar plan todavía acepta `totalPrice`, el backend actualmente **lo ignora** y recalcula el total a partir de:

- los `eventIds` del plan
- el `state` actual persistido del odontograma
- el valor `clinicalEvents[].serviceCost`

En otras palabras: la fuente de verdad del precio ya no es el form del plan sino los eventos clínicos guardados en el odontograma.

### 4. El orden de guardado ahora importa

Si el usuario modifica eventos clínicos en el store local y luego crea/actualiza un plan **sin guardar antes el odontograma**, el backend calculará el total usando el último `state` guardado en BD, no el que está solo en memoria.

Flujo recomendado:

1. Guardar odontograma.
2. Crear o actualizar plan de tratamiento.

---

## Servicios: Nuevo Contrato

Base URL: `{API_BASE_URL}/services`

Permiso requerido: `service`

### Campos nuevos en create/update

```jsonc
{
  "code": "REST-001",
  "name": "Restauracion con resina",
  "type": "TREATMENT",
  "cost": 150.0,
  "odontogramEnabled": true,
  "odontogramSymbolMode": "TEXT", // NONE | ASSET | TEXT | MANUAL
  "symbolPublicId": "services/rest-001", // opcional
  "symbolUrl": null, // requerido si mode = ASSET
  "symbolText": "R" // requerido si mode = TEXT
}
```

### Endpoints relevantes

| Metodo  | URL                       | Uso frontend |
| ------- | ------------------------- | ------------ |
| `POST`  | `/services`               | Crear servicio |
| `PUT`   | `/services`               | Editar servicio |
| `GET`   | `/services/{id}`          | Ver detalle |
| `GET`   | `/services`               | Listar servicios |
| `PATCH` | `/services/{id}/inactivate` | Inactivar servicio |

### Response de servicio

Tanto en `GET /services/{id}` como en el listado `GET /services` el frontend recibe estos campos:

```jsonc
{
  "id": "service-uuid",
  "clinicId": "clinic-uuid",
  "code": "REST-001",
  "name": "Restauracion con resina",
  "type": "TREATMENT",
  "cost": 150.0,
  "odontogramEnabled": true,
  "odontogramSymbolMode": "TEXT",
  "symbolPublicId": "services/rest-001",
  "symbolUrl": null,
  "symbolText": "R",
  "active": true
}
```

### Reglas que frontend debe asumir

- `code` debe ser unico por clinica. Si se repite, el backend responde `409 Conflict`.
- `odontogramSymbolMode` valida estos valores: `NONE`, `ASSET`, `TEXT`, `MANUAL`.
- Si `odontogramEnabled = true` y el modo es `ASSET`, `symbolUrl` es obligatorio.
- Si `odontogramEnabled = true` y el modo es `TEXT`, `symbolText` es obligatorio.
- Si el servicio se inactiva, ya no deberia mostrarse como seleccionable para nuevas citas o nuevos eventos del odontograma.

### Implicaciones de UI

- El formulario de servicios necesita un toggle `odontogramEnabled`.
- Si el toggle esta activo, UI debe mostrar selector de `odontogramSymbolMode`.
- Segun el modo, UI debe pedir datos condicionales:
  - `ASSET` -> `symbolUrl` y opcionalmente `symbolPublicId`
  - `TEXT` -> `symbolText`
  - `MANUAL` -> frontend decide la representacion
  - `NONE` -> no requiere configuracion visual
- En el listado de servicios conviene mostrar un badge tipo "Disponible en odontograma".
- Para poblar selectores dentro del odontograma, se recomienda pedir solo servicios activos y con `odontogramEnabled = true`.

Ejemplo de filtro util:

```typescript
await axios.get("/services", {
  params: {
    filters: ["active__EQ__true", "odontogramEnabled__EQ__true"],
  },
});
```

---

## Citas: Vinculacion con Servicios

Base URL: `{API_BASE_URL}/appointments`

### Crear cita

Request:

```jsonc
{
  "patientId": "patient-uuid",
  "doctorId": "doctor-uuid",
  "date": "2026-04-10",
  "time": "09:00",
  "duration": 30,
  "status": "scheduled",
  "type": "consultation",
  "notes": "Control",
  "serviceId": "service-uuid",
  "serviceCode": null,
  "serviceName": null,
  "serviceCost": null
}
```

### Regla real del backend

Si `serviceId` viene informado:

- el backend busca el servicio en BD
- valida que exista
- valida que este activo
- guarda snapshot con `serviceId`, `serviceCode`, `serviceName` y `serviceCost`

Los campos `serviceCode`, `serviceName` y `serviceCost` que frontend envie en el request no son la fuente de verdad en create; el backend toma esos datos desde la tabla `services`.

### Campos nuevos que vuelven en consultas de citas

Las respuestas de:

- `GET /appointments/doctor/{doctorId}`
- `GET /appointments/patient/{patientId}`

incluyen:

```jsonc
{
  "serviceId": "service-uuid",
  "serviceCode": "REST-001",
  "serviceName": "Restauracion con resina",
  "serviceCost": 150.0
}
```

### Implicaciones de UI

- El modal/form de crear cita puede trabajar solo con `serviceId` como input real.
- Los campos `serviceCode`, `serviceName` y `serviceCost` deben tratarse como snapshot de lectura.
- Las vistas de agenda e historial ya pueden mostrar el servicio asociado a la cita sin otro fetch.
- Si un servicio cambia de nombre o costo despues, la cita sigue mostrando el snapshot guardado.
- Si un servicio fue inactivado, no puede seleccionarse en una nueva cita.

### Valores recomendados para enums en citas

Para evitar inconsistencias con los handlers actuales, enviar exactamente estos strings en minuscula:

- `status`: `scheduled`, `completed`, `cancelled`
- `type`: `consultation`, `routine`, `follow_up`, `emergency`

Nota:

- usar `follow_up`
- no usar `follow-up`

---

## Odontograma y Planes de Tratamiento: Impacto de Servicios

Base URL odontograma: `{API_BASE_URL}/odontograms`

Base URL planes: `{API_BASE_URL}/treatment-plans`

Permiso requerido: `odontogram`

### El `state` del odontograma sigue siendo un string JSON

Frontend debe seguir enviando:

```jsonc
{
  "patientId": "patient-uuid",
  "visitId": "visit-uuid",
  "authorId": "doctor-uuid",
  "clinicId": "clinic-uuid",
  "version": 3,
  "state": "{\"teeth\": [...], \"clinicalEvents\": [...]}"
}
```

### Lo nuevo que importa para pricing

Cuando se crea o actualiza un plan de tratamiento, el backend:

1. toma `eventIds`
2. busca el odontograma actual persistido del paciente
3. lee `state.clinicalEvents`
4. suma `serviceCost` de los eventos cuyo `id` este incluido en `eventIds`

Por eso, para que el total salga bien, frontend debe garantizar que cada evento clinico relevante tenga:

- `id` estable
- `serviceCost`

Si ademas frontend necesita trazabilidad o render estable, es recomendable guardar tambien en el evento:

- `serviceId`
- `serviceCode`
- `serviceName`
- metadata visual del simbolo si la UI la usa como snapshot

Esto ultimo es una recomendacion de integracion: el backend no obliga ese shape, pero el frontend es dueno del JSON del odontograma y puede persistirlo sin migraciones.

### Crear plan

```jsonc
{
  "patientId": "patient-uuid",
  "name": "Plan restaurador",
  "description": "Sector posterior",
  "totalPrice": 999.0, // compatibilidad, hoy no es fuente de verdad
  "eventIds": "[\"event-1\", \"event-2\"]"
}
```

### Actualizar plan

```jsonc
{
  "id": "plan-uuid",
  "name": "Plan restaurador",
  "description": "Sector posterior",
  "status": "active", // active | completed | cancelled
  "totalPrice": 999.0, // compatibilidad, hoy no es fuente de verdad
  "eventIds": "[\"event-1\", \"event-2\"]"
}
```

### Reglas de negocio que impactan directamente al frontend

- `eventIds` es `String JSON`, no array nativo.
- `totalPrice` del request no define el valor final guardado.
- Si un evento no tiene `serviceCost`, aporta `0` al total.
- Si un `eventId` no existe en el `state` actual del odontograma, no aporta nada al total.
- Si frontend regenera IDs de eventos en vez de conservarlos, los planes pueden perder la relacion.
- Si frontend elimina un evento del `state` y luego actualiza el plan, el backend podria recalcular un total menor.

### Orden recomendado para operaciones

#### Caso: el usuario cambia servicio/costo de eventos y luego crea un plan

```text
1. Actualizar store local del odontograma
2. PUT /odontograms
3. POST /treatment-plans
```

#### Caso: el usuario cambia los eventos asociados a un plan existente

```text
1. Si hubo cambios en clinicalEvents -> guardar primero PUT /odontograms
2. PUT /treatment-plans
```

### Valores recomendados para enums en planes

Enviar exactamente:

- `active`
- `completed`
- `cancelled`

---

## Checklist para el Equipo Frontend

- Agregar campos de configuracion odontograma al CRUD de servicios.
- Filtrar servicios activos y `odontogramEnabled = true` para selectores del odontograma.
- Usar `serviceId` como input real al crear citas.
- Renderizar en citas los snapshots `serviceCode`, `serviceName` y `serviceCost`.
- Mantener `clinicalEvents[].id` estables en el tiempo.
- Guardar `clinicalEvents[].serviceCost` si ese evento debe participar en `totalPrice`.
- Tratar `totalPrice` en planes como un valor derivado, no como input autoritativo.
- Guardar el odontograma antes de crear o actualizar planes si hubo cambios locales en eventos.
- Seguir usando `JSON.stringify` para `state` y `eventIds`.

---

## Riesgos de Integracion a Evitar

- Crear plan con eventos recien editados pero no persistidos.
- Reemplazar eventos completos y perder sus IDs originales.
- Mostrar servicios inactivos como seleccionables.
- Confiar en `totalPrice` digitado manualmente en el form.
- Enviar enums con formatos distintos a los esperados por los handlers.

---

## Archivos Backend de Referencia

### Services

- `src/main/java/com/kodewave/clinic/backend/presentation/controllers/serviceControllers/ServiceController.java`
- `src/main/java/com/kodewave/clinic/backend/application/commands/serviceCommands/create/CreateServiceCommand.java`
- `src/main/java/com/kodewave/clinic/backend/application/commands/serviceCommands/update/UpdateServiceCommand.java`
- `src/main/java/com/kodewave/clinic/backend/application/queries/serviceQueries/getAll/responses/GetServicesResponseModel.java`
- `src/main/java/com/kodewave/clinic/backend/application/queries/serviceQueries/getById/responses/GetServiceByIdResponseModel.java`

### Appointments

- `src/main/java/com/kodewave/clinic/backend/presentation/controllers/appointmentControllers/AppointmentController.java`
- `src/main/java/com/kodewave/clinic/backend/application/commands/appointmentCommand/create/CreateAppointmentCommand.java`
- `src/main/java/com/kodewave/clinic/backend/application/commands/appointmentCommand/create/CreateAppointmentCommandHandler.java`
- `src/main/java/com/kodewave/clinic/backend/application/queries/appointmentQueries/getDoctorAppointments/response/GetDoctorAppointmentsResponseModel.java`
- `src/main/java/com/kodewave/clinic/backend/application/queries/appointmentQueries/getPatientAppointments/response/GetPatientAppointmentsResponseModel.java`

### Odontogram y Treatment Plans

- `src/main/java/com/kodewave/clinic/backend/presentation/controllers/odontogramControllers/OdontogramController.java`
- `src/main/java/com/kodewave/clinic/backend/presentation/controllers/odontogramControllers/TreatmentPlanController.java`
- `src/main/java/com/kodewave/clinic/backend/application/commands/odontogramCommands/save/SaveOdontogramCommandHandler.java`
- `src/main/java/com/kodewave/clinic/backend/application/commands/odontogramCommands/treatmentPlan/create/CreateTreatmentPlanCommandHandler.java`
- `src/main/java/com/kodewave/clinic/backend/application/commands/odontogramCommands/treatmentPlan/update/UpdateTreatmentPlanCommandHandler.java`

