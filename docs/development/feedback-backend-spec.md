# Feedback System — Backend Implementation Spec

> **Estado**: Listo para implementar
> **Frontend**: ya implementado en rama `feat/feedback-system`
> **Prioridad**: Alta — la clínica piloto está en producción y necesita reportar bugs
> **Esfuerzo estimado**: CRUD estándar, mismo patrón que `/patients` + `/patients/{id}/attachments`

---

## 1. Contexto

Los doctores de la clínica piloto necesitan reportar errores, sugerencias y
preguntas desde la app. El frontend ya tiene:

- Botón flotante (FAB) en todas las pantallas autenticadas
- Modal con selector de tipo, descripción, paste/drag de screenshots
- Metadata automática (URL, browser, resolución, tema, contexto clínico)
- Página `/support` con lista de tickets del doctor y filtros
- Servicio HTTP apuntando a `POST /feedback`, `GET /feedback`, etc.

El backend necesita exponer los endpoints que el frontend ya consume.

---

## 2. Modelo de datos

### 2.1 Tabla `feedback_tickets`

```sql
CREATE TABLE feedback_tickets (
    id               VARCHAR(36)   PRIMARY KEY,  -- UUID
    type             VARCHAR(20)   NOT NULL,      -- 'bug' | 'improvement' | 'question'
    description      VARCHAR(2000) NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'pending',
                                                  -- 'pending' | 'in_review' | 'in_progress' | 'resolved' | 'closed'
    priority         VARCHAR(20),                 -- 'low' | 'medium' | 'high' | 'critical' (asignado por admin)
    metadata         TEXT,                        -- JSON string con FeedbackMetadata del frontend
    created_by       VARCHAR(36)   NOT NULL,      -- doctor ID (del JWT)
    created_by_name  VARCHAR(100)  NOT NULL,      -- nombre del doctor (desnormalizado para listados)
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP,
    resolved_at      TIMESTAMP,
    resolved_by      VARCHAR(36),                 -- ID del admin que resolvió

    CONSTRAINT fk_feedback_doctor FOREIGN KEY (created_by) REFERENCES doctors(id)
);

CREATE INDEX idx_feedback_created_by ON feedback_tickets(created_by);
CREATE INDEX idx_feedback_status     ON feedback_tickets(status);
CREATE INDEX idx_feedback_type       ON feedback_tickets(type);
CREATE INDEX idx_feedback_created_at ON feedback_tickets(created_at DESC);
```

### 2.2 Tabla `feedback_attachments`

```sql
CREATE TABLE feedback_attachments (
    ticket_id        VARCHAR(36)   NOT NULL,
    attachment_url   VARCHAR(512)  NOT NULL,      -- URL de Cloudinary

    CONSTRAINT fk_attachment_ticket FOREIGN KEY (ticket_id)
        REFERENCES feedback_tickets(id) ON DELETE CASCADE
);
```

### 2.3 Tabla `feedback_comments`

```sql
CREATE TABLE feedback_comments (
    id               VARCHAR(36)   PRIMARY KEY,   -- UUID
    ticket_id        VARCHAR(36)   NOT NULL,
    content          VARCHAR(2000) NOT NULL,
    author_id        VARCHAR(36)   NOT NULL,
    author_name      VARCHAR(100)  NOT NULL,
    is_staff         BOOLEAN       NOT NULL DEFAULT FALSE,  -- true = equipo dev
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comment_ticket FOREIGN KEY (ticket_id)
        REFERENCES feedback_tickets(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_ticket ON feedback_comments(ticket_id);
```

---

## 3. Endpoints

**Base path**: `/feedback`
**Auth**: Bearer Token (todos los endpoints)
**Content-Type**: `application/json` excepto POST de creación (`multipart/form-data`)

### 3.1 Crear ticket

```
POST /feedback
Content-Type: multipart/form-data
Auth: cualquier usuario autenticado
```

**Request parts**:

| Part | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `data` | `application/json` | Sí | JSON con `CreateFeedbackRequest` |
| `attachments` | `image/*` (array) | No | 0 a 5 imágenes, máx 5MB cada una |

**`CreateFeedbackRequest` (JSON en el part `data`)**:

```json
{
  "type": "bug",              // REQUIRED: "bug" | "improvement" | "question"
  "description": "Al guardar la cita me sale pantalla en blanco",  // REQUIRED, max 2000 chars
  "metadata": "{\"currentUrl\":\"https://app.clinica.com/appointments/new\",\"currentRoute\":\"/appointments/new\",\"browser\":\"Chrome 126 / macOS\",\"screenSize\":\"1920x1080\",\"theme\":\"dark\",\"appVersion\":\"0.1.0\",\"activePatientId\":null,\"activeAppointmentId\":null}"
                              // REQUIRED: JSON string con metadata del frontend
}
```

**Lógica del backend**:

1. Extraer `doctorId` y `doctorName` del JWT (claims del token)
2. Subir cada archivo en `attachments` a Cloudinary con folder `"feedback"` (reutilizar el `CloudinaryService` existente)
3. Guardar ticket con `status = "pending"`, `created_at = now()`
4. Guardar URLs de Cloudinary en `feedback_attachments`
5. **(Opcional)** Enviar webhook a Discord/Slack (ver sección 6)

**Response** (`201 Created`):

```json
{
  "id": "a3f7b2c1-1234-5678-9abc-def012345678"
}
```

**Errores**:

| Status | Caso |
|--------|------|
| 400 | `type` inválido, `description` vacía, o > 2000 chars |
| 401 | Token inválido o expirado |
| 413 | Archivo excede 5MB |

---

### 3.2 Listar mis tickets (paginado)

```
GET /feedback?page=1&pageSize=10&status=pending&type=bug
Auth: cualquier usuario autenticado
```

**Query params**:

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `page` | int | 1 | Página (1-based) |
| `pageSize` | int | 10 | Items por página |
| `status` | string | — | Filtrar por status (opcional) |
| `type` | string | — | Filtrar por tipo (opcional) |
| `q` | string | — | Búsqueda en description (ILIKE, opcional) |

**Lógica**: filtrar por `created_by = doctorId` del JWT. Ordenar por `created_at DESC`.

**Response** (`200 OK`):

```json
{
  "entities": [
    {
      "id": "a3f7b2c1-...",
      "type": "bug",
      "status": "pending",
      "priority": null,
      "description": "Al guardar la cita me sale pantalla en blanco y se pierde lo que...",
      "attachmentCount": 2,
      "commentCount": 1,
      "createdByName": "Dra. Martínez",
      "createdAt": "2026-07-23T14:32:00Z",
      "resolvedAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 3
  }
}
```

> **Nota**: `description` truncada a 150 caracteres en el summary.

---

### 3.3 Detalle de ticket

```
GET /feedback/{id}
Auth: autor del ticket O admin/superadmin
```

**Response** (`200 OK`):

```json
{
  "id": "a3f7b2c1-...",
  "type": "bug",
  "status": "in_review",
  "priority": "high",
  "description": "Al guardar la cita me sale pantalla en blanco y se pierde lo que escribí. Pasó dos veces seguidas.",
  "attachments": [
    "https://res.cloudinary.com/xxx/image/upload/feedback/screenshot1.png",
    "https://res.cloudinary.com/xxx/image/upload/feedback/screenshot2.png"
  ],
  "metadata": {
    "currentUrl": "https://app.clinica.com/appointments/new",
    "currentRoute": "/appointments/new",
    "browser": "Chrome 126 / macOS",
    "screenSize": "1920x1080",
    "theme": "dark",
    "appVersion": "0.1.0",
    "activePatientId": null,
    "activeAppointmentId": "cita-uuid-123"
  },
  "createdBy": "doctor-uuid-456",
  "createdByName": "Dra. Martínez",
  "createdAt": "2026-07-23T14:32:00Z",
  "updatedAt": "2026-07-23T15:10:00Z",
  "resolvedAt": null,
  "resolvedBy": null,
  "comments": [
    {
      "id": "comment-uuid-789",
      "ticketId": "a3f7b2c1-...",
      "content": "Estamos investigando, parece relacionado con el timeout del servicio.",
      "authorId": "admin-uuid-001",
      "authorName": "Jorge (Dev)",
      "isStaff": true,
      "createdAt": "2026-07-23T15:10:00Z"
    }
  ]
}
```

> **Nota**: `metadata` se devuelve como objeto JSON parseado (no como string).

**Errores**:

| Status | Caso |
|--------|------|
| 403 | El usuario no es el autor ni admin |
| 404 | Ticket no encontrado |

---

### 3.4 Actualizar estado / prioridad (admin)

```
PATCH /feedback/{id}/status
Auth: solo admin o superadmin
```

**Request**:

```json
{
  "status": "in_review",          // REQUIRED
  "priority": "high"              // OPTIONAL
}
```

**Lógica**:

- Verificar que el usuario tenga rol admin/superadmin
- Actualizar `status`, `priority`, `updated_at = now()`
- Si `status = "resolved"`: setear `resolved_at = now()`, `resolved_by = adminId`
- Si cambia de `resolved` a otro estado: limpiar `resolved_at` y `resolved_by`

**Response** (`200 OK`):

```json
{
  "id": "a3f7b2c1-...",
  "status": "in_review",
  "priority": "high",
  "updatedAt": "2026-07-23T15:10:00Z"
}
```

---

### 3.5 Agregar comentario

```
POST /feedback/{id}/comments
Auth: autor del ticket O admin/superadmin
```

**Request**:

```json
{
  "content": "Adjunto otra captura del error"    // REQUIRED, max 2000 chars
}
```

**Lógica**:

- Extraer `authorId`, `authorName` del JWT
- `isStaff = true` si el usuario tiene rol admin/superadmin
- Guardar comment, actualizar `updated_at` del ticket

**Response** (`201 Created`):

```json
{
  "id": "comment-uuid-new",
  "ticketId": "a3f7b2c1-...",
  "content": "Adjunto otra captura del error",
  "authorId": "doctor-uuid-456",
  "authorName": "Dra. Martínez",
  "isStaff": false,
  "createdAt": "2026-07-23T16:00:00Z"
}
```

---

### 3.6 Listar todos los tickets (admin)

```
GET /feedback/admin?page=1&pageSize=20&status=pending&type=bug&q=pantalla
Auth: solo admin o superadmin
```

Mismos query params y response que 3.2, pero **sin filtrar por `created_by`** (ve todos los tickets de todos los doctores).

---

## 4. Archivos a crear en backend

```
src/main/java/com/kodewave/clinic/backend/
├── domain/entities/feedback/
│   ├── FeedbackTicket.java              ← Entity JPA
│   ├── FeedbackComment.java             ← Entity JPA
│   └── FeedbackAttachment.java          ← Embeddable o Entity simple
├── domain/repositories/
│   ├── FeedbackTicketRepository.java    ← Spring Data JPA
│   └── FeedbackCommentRepository.java   ← Spring Data JPA
├── application/services/
│   ├── FeedbackService.java             ← Lógica de negocio
│   └── FeedbackNotifier.java            ← Webhook Discord/Slack (async)
├── application/dto/feedback/
│   ├── CreateFeedbackRequest.java       ← DTO entrada
│   ├── AddCommentRequest.java           ← DTO entrada
│   ├── UpdateStatusRequest.java         ← DTO entrada
│   ├── FeedbackTicketSummary.java       ← DTO lista
│   ├── FeedbackTicketDetail.java        ← DTO detalle
│   ├── FeedbackCommentDto.java          ← DTO comment
│   └── PaginatedFeedbackResponse.java   ← DTO paginado
└── infrastructure/controllers/
    └── FeedbackController.java          ← REST Controller

src/main/resources/db/migration/
└── V{next}__create_feedback_tables.sql  ← Flyway migration
```

---

## 5. Controller — firma de métodos

```java
@RestController
@RequestMapping("/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    // 3.1 — Crear ticket
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> create(
            @RequestPart("data") CreateFeedbackRequest data,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments,
            @AuthenticationPrincipal UserDetails user) {
        String id = feedbackService.create(data, attachments, user);
        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    // 3.2 — Mis tickets
    @GetMapping
    public ResponseEntity<PaginatedFeedbackResponse> myTickets(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(
            feedbackService.getMyTickets(user, page, pageSize, status, type, q));
    }

    // 3.3 — Detalle
    @GetMapping("/{id}")
    public ResponseEntity<FeedbackTicketDetail> detail(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(feedbackService.getDetail(id, user));
    }

    // 3.4 — Cambiar estado (admin)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable String id,
            @RequestBody UpdateStatusRequest body,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(feedbackService.updateStatus(id, body, user));
    }

    // 3.5 — Agregar comentario
    @PostMapping("/{id}/comments")
    public ResponseEntity<FeedbackCommentDto> addComment(
            @PathVariable String id,
            @RequestBody AddCommentRequest body,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(201)
            .body(feedbackService.addComment(id, body, user));
    }

    // 3.6 — Todos los tickets (admin)
    @GetMapping("/admin")
    public ResponseEntity<PaginatedFeedbackResponse> allTickets(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(
            feedbackService.getAllTickets(user, page, pageSize, status, type, q));
    }
}
```

---

## 6. Notificaciones al equipo dev (webhook)

Cuando se crea un ticket, `FeedbackNotifier` envía un POST async a un webhook
de Discord o Slack. No es bloqueante — si falla, solo se loguea.

### Configuración

```properties
# application.properties (o variable de entorno)
FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/xxxx/yyyy
```

### Payload Discord

```java
@Service
public class FeedbackNotifier {

    @Value("${FEEDBACK_WEBHOOK_URL:}")
    private String webhookUrl;

    @Async
    public void notifyNewTicket(FeedbackTicket ticket) {
        if (webhookUrl.isBlank()) return;

        Map<String, Object> embed = Map.of(
            "title", emojiFor(ticket.getType()) + " " + ticket.getType().toUpperCase(),
            "description", truncate(ticket.getDescription(), 300),
            "color", colorFor(ticket.getType()),
            "fields", List.of(
                Map.of("name", "Doctor", "value", ticket.getCreatedByName(), "inline", true),
                Map.of("name", "Página", "value", extractRoute(ticket.getMetadata()), "inline", true),
                Map.of("name", "Adjuntos", "value", ticket.getAttachments().size() + " archivo(s)", "inline", true),
                Map.of("name", "Browser", "value", extractBrowser(ticket.getMetadata()), "inline", true)
            ),
            "timestamp", ticket.getCreatedAt().toString(),
            "footer", Map.of("text", "Ticket #" + ticket.getId().substring(0, 8))
        );

        Map<String, Object> payload = Map.of("embeds", List.of(embed));

        try {
            new RestTemplate().postForEntity(webhookUrl, payload, String.class);
        } catch (Exception e) {
            log.warn("Webhook failed for ticket {}: {}", ticket.getId(), e.getMessage());
        }
    }

    private String emojiFor(String type) {
        return switch (type) {
            case "bug" -> "🐛";
            case "improvement" -> "💡";
            case "question" -> "❓";
            default -> "📋";
        };
    }

    private int colorFor(String type) {
        return switch (type) {
            case "bug" -> 0xE11D48;         // rose-600
            case "improvement" -> 0x2563EB;  // blue-600
            case "question" -> 0x06B6D4;     // cyan-500
            default -> 0x6B7280;             // gray-500
        };
    }
}
```

### Resultado en Discord

```
🐛 BUG
───────────────────────────
Al guardar la cita me sale pantalla en blanco y se pierde
lo que escribí. Pasó dos veces seguidas.

Doctor      Página              Adjuntos      Browser
Dra. M.     /appointments/new   2 archivo(s)  Chrome 126 / macOS

Ticket #a3f7b2c1 · 23 jul 2026 14:32
```

---

## 7. Permisos

**No se requiere un nuevo permiso**. La lógica de acceso es:

| Acción | Quién puede |
|--------|-------------|
| Crear ticket | Cualquier usuario con sesión válida |
| Ver mis tickets | Cualquier usuario (filtrado por `created_by = userId`) |
| Ver detalle | Autor del ticket O admin/superadmin |
| Cambiar estado | Solo admin/superadmin |
| Agregar comentario | Autor del ticket O admin/superadmin |
| Ver todos los tickets | Solo admin/superadmin (`GET /feedback/admin`) |

La verificación de admin se hace con el mismo mecanismo que ya existe en el
backend (verificar `roleName` del JWT o la presencia de permisos de admin).

---

## 8. Validaciones

| Campo | Regla |
|-------|-------|
| `type` | Uno de: `bug`, `improvement`, `question` |
| `description` | No vacío, máximo 2000 caracteres |
| `metadata` | String JSON válido (no se valida el schema interno) |
| `attachments` | Máximo 5 archivos, cada uno ≤ 5MB, solo `image/*` |
| `comment.content` | No vacío, máximo 2000 caracteres |
| `status` | Uno de: `pending`, `in_review`, `in_progress`, `resolved`, `closed` |
| `priority` | Uno de: `low`, `medium`, `high`, `critical` (o null) |

---

## 9. Contrato frontend ↔ backend (resumen rápido)

El frontend ya está implementado y consume estos contratos:

```
Frontend service         →  Backend endpoint
─────────────────────────────────────────────────
feedbackService          →
  .createTicket()        →  POST   /feedback              (multipart)
  .getMyTickets()        →  GET    /feedback               (paginado)
  .getTicketById(id)     →  GET    /feedback/{id}
  .addComment(id, data)  →  POST   /feedback/{id}/comments
```

Los tipos TypeScript del frontend están en:
- `lib/entity/feedback/index.ts` — interfaces y tipos
- `lib/services/feedback/feedback.service.ts` — servicio HTTP

---

## 10. Dependencias en backend

| Qué | Estado |
|-----|--------|
| Spring Web | Ya existe |
| Spring Data JPA | Ya existe |
| Flyway / Liquibase | Ya existe (migrations) |
| CloudinaryService | Ya existe (reutilizar con folder `"feedback"`) |
| RestTemplate | Ya existe (para webhook) |
| `@Async` | Ya configurado (para notifier) |

**Cero dependencias nuevas.**

---

## 11. Checklist de implementación

- [ ] Crear migración SQL (`feedback_tickets`, `feedback_attachments`, `feedback_comments`)
- [ ] Crear entidades JPA (`FeedbackTicket`, `FeedbackComment`)
- [ ] Crear repositorios Spring Data
- [ ] Crear DTOs (request y response)
- [ ] Crear `FeedbackService` con lógica CRUD
- [ ] Crear `FeedbackController` con 6 endpoints
- [ ] Crear `FeedbackNotifier` para webhook Discord/Slack
- [ ] Agregar `FEEDBACK_WEBHOOK_URL` a `application.properties`
- [ ] Crear webhook en Discord/Slack del equipo
- [ ] Test manual: crear ticket desde el frontend → verificar en DB → verificar en Discord
