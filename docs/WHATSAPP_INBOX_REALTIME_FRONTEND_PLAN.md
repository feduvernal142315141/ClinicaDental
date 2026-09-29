# F11 — WhatsApp Inbox Realtime Frontend Plan

> **Status**: PLAN ONLY — no code implemented
> **Date**: 2026-09-29
> **Scope**: Frontend SSE integration + adaptive polling fallback

---

## 1. Executive Summary

### Problema actual

El Inbox de WhatsApp usa polling agresivo como mecanismo de actualización:

| Resource | Intervalo actual (active) | Intervalo actual (idle) |
|----------|--------------------------|------------------------|
| Mensajes | 8s | 30s |
| Lista conversaciones | 15s | 45s |
| Summary/badges | 30s | 60s |

**[EVIDENCIA]** `lib/hooks/inbox/use-inbox-polling.ts` lineas 7-14:
```
ACTIVE_LIST_MS = 15_000
ACTIVE_MESSAGES_MS = 8_000
ACTIVE_SUMMARY_MS = 30_000
IDLE_LIST_MS = 45_000
IDLE_MESSAGES_MS = 30_000
IDLE_SUMMARY_MS = 60_000
```

Esto genera latencia de 3-15 segundos para ver un mensaje nuevo y produce requests innecesarios cuando no hay cambios. Con 5+ clínicas simultáneas, el backend recibe polling constante.

### Objetivo

Implementar **SSE (Server-Sent Events) con ticket de autenticación temporal** como canal principal de notificación, manteniendo polling adaptativo como fallback robusto.

### Qué aporta SSE
- Latencia sub-1s: mensaje del paciente → visible en Inbox casi instantáneo
- Zero polling cuando SSE está sano: 0 requests periódicos innecesarios
- Dalia experience: respuesta de IA aparece en tiempo real sin esperar 8s

### REST sigue siendo source of truth
SSE **solo notifica "algo cambió"**. Frontend consulta las mismas APIs REST existentes para obtener datos actualizados. No se envía contenido de mensajes por SSE.

### Qué NO cambia
- Layout del Inbox (3 columnas desktop, sheets mobile)
- Componentes visuales (bubbles, timeline, composer)
- Message merge/dedup por ID
- Keyset pagination para cargar historial
- Optimistic send con `addLocalMessage`
- Hooks de mutación (takeover, release, resolve, send, etc.)
- Sistema de permisos (`usePermission`)
- Axios interceptors y refresh token flow

---

## 2. Current Polling Audit

### 2.1 Arquitectura actual

```
InboxPage.tsx (linea 88)
└── useInboxRealtime()
    ├── useInboxSSE()          ← intenta conectar, actualmente con JWT en URL
    │   └── status: "connecting" | "connected" | "disconnected"
    └── useInboxPolling()      ← fallback, enabled: !sseConnected
        ├── listTimer (15s/45s)
        ├── messagesTimer (8s/30s)
        └── summaryTimer (30s/60s)
```

**[EVIDENCIA]** `components/features/inbox/InboxPage.tsx` lineas 88-94:
```typescript
useInboxRealtime({
  conversationListRefresh: convList.refresh,
  activeConversationRefresh: selectedId ? convDetail.refresh : undefined,
  messagesRefresh: selectedId ? msgs.refresh : undefined,
  summaryRefresh: summary.refresh,
  activeConversationId: selectedId ?? undefined,
});
```

### 2.2 Dónde viven los timers

| Timer | Hook | Tipo | Cleanup |
|-------|------|------|---------|
| `listTimer` | `use-inbox-polling.ts:22` | `setInterval` ref | `clearTimers()` linea 30 |
| `messagesTimer` | `use-inbox-polling.ts:23` | `setInterval` ref | `clearTimers()` linea 31 |
| `summaryTimer` | `use-inbox-polling.ts:24` | `setInterval` ref | `clearTimers()` linea 32 |
| `retryTimer` | `use-inbox-sse.ts` | `setTimeout` ref | `cleanup()` linea 55 |
| idle check | `use-inbox-polling.ts:93` | `setInterval` local | clearInterval en cleanup |

### 2.3 Cómo arrancan

**[EVIDENCIA]** `use-inbox-polling.ts` lineas 101-108: Auto-start via `useEffect` cuando `enabled: true`. No requiere llamada manual.

### 2.4 Reacción a visibilitychange

**Polling** (`use-inbox-polling.ts:111-127`):
- Hidden → `clearTimers()` (todos los intervalos pausados)
- Visible → `lastActivityRef.current = Date.now()` + `startTimers()` (reanuda con intervalos activos)

**SSE** (`use-inbox-sse.ts:133-150`):
- Hidden → `cleanup()` cierra EventSource + status: "disconnected"
- Visible → `retriesRef.current = 0` + `connect()` (reconexión fresca)

### 2.5 Idle detection

**[EVIDENCIA]** `use-inbox-polling.ts` lineas 76-87:
- Eventos trackeados: `mousedown`, `keydown`, `touchstart`, `scroll` (todas con `{ passive: true }`)
- Idle threshold: 2 minutos sin interacción
- Al detectar idle → `startTimers()` con intervalos lentos
- Al detectar actividad si estaba idle → `startTimers()` con intervalos rápidos

### 2.6 Bugs identificados

| # | Bug | Archivo:Línea | Severidad |
|---|-----|--------------|-----------|
| B1 | SSE pone JWT principal en URL (visible en history/logs/proxies) | `use-inbox-sse.ts:82` | **ALTA** |
| B2 | Sin timeout de conexión SSE — si backend no responde headers, queda en "connecting" indefinido y polling no arranca | `use-inbox-sse.ts` | MEDIA |
| B3 | Polling no tiene backoff en errores — si REST falla 500, sigue intentando al mismo ritmo | `use-inbox-polling.ts` | MEDIA |
| B4 | `temp-${Date.now()}` para optimistic IDs — posible colisión en <1ms | `InboxPage.tsx:148` | BAJA |
| B5 | Activity listeners se agregan doble en React StrictMode (dev) | `use-inbox-polling.ts:82-86` | BAJA |
| B6 | No hay `summary_update` en el event handler actual — summary se refresca con `message_new` y `conversation_update` | `use-inbox-realtime.ts:56-89` | N/A (fix en F11) |

---

## 3. Proposed Architecture

### 3.1 Hook hierarchy

```
InboxPage.tsx
└── useInboxRealtime(options)
    ├── useInboxSSE(onEvent, enabled)
    │   ├── POST /whatsapp/inbox/events/ticket  → ticket temporal
    │   ├── GET  /whatsapp/inbox/events?ticket=... → EventSource
    │   ├── status: RealtimeConnectionState
    │   ├── addEventListener por tipo de evento
    │   └── reconnect con ticket NUEVO + exponential backoff
    │
    └── useInboxPolling(callbacks, enabled: !sseConnected)
        ├── active intervals (15s/8s/30s)
        ├── idle intervals (45s/30s/60s)
        └── visibility + idle handling
```

### 3.2 Archivos impactados

| Archivo | Cambio |
|---------|--------|
| `lib/hooks/inbox/use-inbox-sse.ts` | **Reescribir**: ticket flow, state machine, nuevo reconnect |
| `lib/hooks/inbox/use-inbox-realtime.ts` | **Actualizar**: manejar `summary_update`, coalescing, resync |
| `lib/hooks/inbox/use-inbox-polling.ts` | **Menor**: sin cambios grandes, ya funciona bien |
| `lib/services/inbox/inbox.service.ts` | **Agregar**: `createInboxSseTicket()` |
| `lib/entity/inbox/index.ts` | **Agregar**: tipos SSE event data, RealtimeConnectionState |
| `components/features/inbox/InboxPage.tsx` | **Sin cambios**: ya usa `useInboxRealtime` |

### 3.3 Archivos que NO cambian

- `InboxTimeline.tsx` — scroll behavior ya correcto
- `InboxMessageBubble.tsx` — renderizado puro
- `InboxConversationList.tsx` — renderizado puro
- `InboxComposer.tsx` — renderizado puro
- `use-inbox-messages.ts` — merge/dedup ya correcto
- `use-inbox-conversations.ts` — refresh ya correcto
- `use-inbox-actions.ts` — mutations sin cambio

---

## 4. Realtime State Machine

### 4.1 Estados

```
          DISCONNECTED
              │
    ┌─────────▼─────────┐
    │   OBTAINING_TICKET │  POST /events/ticket
    └─────────┬─────────┘
              │ ticket received
    ┌─────────▼─────────┐
    │    CONNECTING      │  new EventSource(url?ticket=...)
    └─────────┬─────────┘
              │ onopen + "connected" event
    ┌─────────▼─────────┐
    │    CONNECTED       │  SSE stream active, polling OFF
    └─────────┬─────────┘
              │ onerror / stream closed
    ┌─────────▼─────────┐
    │   RECONNECTING     │  backoff timer → OBTAINING_TICKET
    └─────────┬─────────┘
              │ MAX_RETRIES exceeded
    ┌─────────▼─────────┐
    │  FALLBACK_POLLING  │  polling ON, retry SSE cada 60s
    └─────────────────────┘
```

### 4.2 Tipo

```typescript
type RealtimeConnectionState =
  | "disconnected"
  | "obtaining_ticket"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "fallback_polling";
```

**[DECISIÓN RECOMENDADA]** Un solo `state` string en vez de múltiples booleans (`isConnected`, `isConnecting`, `hasError`, `shouldPoll`, `retrying`). Previene estados contradictorios.

### 4.3 Transiciones

| Desde | Evento | Hacia | Acción |
|-------|--------|-------|--------|
| `disconnected` | mount / enable | `obtaining_ticket` | POST ticket |
| `obtaining_ticket` | ticket OK | `connecting` | new EventSource |
| `obtaining_ticket` | 401 | `disconnected` | auth flow handles |
| `obtaining_ticket` | 403 | `disconnected` | sin permiso, no reintentar |
| `obtaining_ticket` | error | `reconnecting` | backoff |
| `connecting` | onopen | `connected` | reset retries, REST resync |
| `connecting` | timeout 10s | `reconnecting` | backoff |
| `connecting` | onerror | `reconnecting` | backoff |
| `connected` | event | `connected` | targeted refresh |
| `connected` | onerror | `reconnecting` | backoff |
| `connected` | tab hidden | `disconnected` | close EventSource |
| `connected` | offline | `disconnected` | close EventSource |
| `reconnecting` | timer fires | `obtaining_ticket` | nuevo ticket |
| `reconnecting` | max retries | `fallback_polling` | polling ON |
| `fallback_polling` | 60s timer / online / visible | `obtaining_ticket` | retry SSE |
| any | unmount | `disconnected` | cleanup todo |

---

## 5. SSE Ticket Flow

### 5.1 Flujo

```
1. POST /whatsapp/inbox/events/ticket
   Headers: Authorization: Bearer {jwt}
   → Response: { "ticket": "opaque-string" }

2. GET /whatsapp/inbox/events?ticket={ticket}
   Content-Type: text/event-stream
   (NO Authorization header — ticket es la auth)
```

### 5.2 Implementación conceptual en service

```typescript
// lib/services/inbox/inbox.service.ts — agregar:
export async function createInboxSseTicket(): Promise<string> {
  const response = await servicePost<Record<string, never>, { ticket: string }>(
    `${BASE}/events/ticket`, {}
  );
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return (response.data as { ticket: string }).ticket;
  }
  handleServiceError(response, "Error al obtener ticket SSE");
}
```

### 5.3 EventSource en hook (NO en service)

EventSource vive en el hook `useInboxSSE`, no dentro del Axios service layer, porque:
- EventSource es long-lived (no request-response)
- Necesita lifecycle management (refs, cleanup)
- No pasa por interceptors de Axios

---

## 6. Ticket Security

| Regla | Detalle |
|-------|---------|
| Single-use | Backend invalida ticket tras primer uso |
| TTL 60s | Si no se usa en 60s, expira |
| Solo en memoria | `const ticket = await createTicket()` → directo a URL |
| No persistir | NO localStorage, NO sessionStorage, NO cookie |
| No loggear | NO console.log, NO error tracking, NO analytics |
| Reconexión | Pedir ticket NUEVO siempre |

**[EVIDENCIA]** El hook actual pone el JWT principal en la URL (`use-inbox-sse.ts:82`). Esto se elimina. El ticket temporal es opaco y de un solo uso — si se filtra en logs, no compromete la sesión.

---

## 7. EventSource Reconnect

### 7.1 Estrategia de backoff

| Intento | Delay | Acumulado |
|---------|-------|-----------|
| 1 | 1s | 1s |
| 2 | 2s | 3s |
| 3 | 4s | 7s |
| 4 | 8s | 15s |
| 5 | 15s | 30s |
| 6+ | 15s (cap) | +15s c/u |

**Max intentos antes de FALLBACK_POLLING**: 6

**Jitter**: Agregar ±20% random para evitar thundering herd si múltiples tabs reconectan simultáneamente.

```
delay = min(BASE * 2^attempt, MAX_DELAY) * (0.8 + Math.random() * 0.4)
```

### 7.2 Flujo de reconexión

```
onerror / stream closed
→ eventSource.close()
→ state = "reconnecting"
→ setTimeout(delay con jitter)
→ POST nuevo ticket
→ new EventSource(url?ticket=nuevo)
→ REST full resync (gap coverage)
```

**CRÍTICO**: NO reutilizar URL anterior. El ticket anterior ya fue consumido o expiró.

### 7.3 Auto-reconnect nativo deshabilitado

EventSource tiene auto-reconnect nativo, pero reusa la misma URL. Con ticket single-use esto falla. Se debe:
1. Escuchar `onerror`
2. Llamar `eventSource.close()` inmediatamente
3. Implementar reconnect manual con nuevo ticket

---

## 8. Successful Connection

Cuando EventSource conecta exitosamente:

1. `state = "connected"`
2. Reset `retryAttempts = 0`
3. Deshabilitar polling (`enabled: false`)
4. **REST resync inicial**:
   - `refreshConversationList()`
   - `refreshSummary()`
   - Si hay `activeConversationId`: `refreshMessages()` + `refreshConversationDetail()`

**[DECISIÓN RECOMENDADA]** Resync siempre al conectar porque existe un gap entre ticket creation y EventSource connected. Eventos emitidos en ese gap se pierden.

---

## 9. Reconnection Full Resync

Después de reconectar SSE (sea por error o visibility restore):

| Refresh | Condición |
|---------|-----------|
| `refreshConversationList()` | Siempre |
| `refreshSummary()` | Siempre |
| `refreshMessages(activeId)` | Solo si hay conversación activa |
| `refreshConversationDetail(activeId)` | Solo si hay conversación activa |

**NO** recargar mensajes de conversaciones no activas.

---

## 10. Event Handling Matrix

| Evento | conversationId == active | conversationId != active | Sin conversationId |
|--------|-------------------------|-------------------------|--------------------|
| `message_new` | refreshMessages + refreshList | refreshList | refreshList |
| `message_status` | refreshMessages | (nada) | — |
| `conversation_update` | refreshDetail + refreshList | refreshList | refreshList |
| `summary_update` | refreshSummary | refreshSummary | refreshSummary |
| `heartbeat` (SSE comment) | (ignorar) | (ignorar) | (ignorar) |

**[PROPUESTO]** Agregar `summary_update` al handler. Actualmente el realtime hook no lo maneja — summary se refresca como side effect de `message_new` y `conversation_update`.

**[EVIDENCIA]** `use-inbox-realtime.ts` linea 57: heartbeat se ignora correctamente. Pero no hay handler para `summary_update` — solo ignora lo desconocido.

---

## 11. Event Coalescing

### Problema

Backend puede emitir en ráfaga (AFTER_COMMIT events):
```
message_new          → refreshList + refreshMessages + refreshSummary
conversation_update  → refreshList + refreshDetail
summary_update       → refreshSummary
```

Sin coalescing: 6 REST fetches (3 refreshList redundantes).

### Solución: Invalidation queue con debounce

```typescript
const invalidationQueue = {
  messages: false,
  conversationList: false,
  conversationDetail: false,
  summary: false,
};

// Cada evento marca qué invalidar
// Debounce de 100ms ejecuta los refreshes marcados
```

**Ventana**: 100ms

**Resultado para el ejemplo**: 1 refreshList + 1 refreshMessages + 1 refreshDetail + 1 refreshSummary = 4 fetches (no 6).

---

## 12. Selective Refresh

Funciones de refresh existentes (NO crear nuevas):

| Función | Ubicación | Tipo |
|---------|-----------|------|
| `convList.refresh()` | `use-inbox-conversations.ts:85` | Silent (no loading state) |
| `convDetail.refresh()` | `use-inbox-conversation.ts:36` | Silent |
| `msgs.refresh()` | `use-inbox-messages.ts:114` | Silent, merge por ID |
| `summary.refresh()` | `use-inbox-summary.ts:30` | Silent |

Todas son silenciosas (no resetean `loading`). Ideales para realtime.

**NO** usar `router.refresh()` ni invalidar cache global.

---

## 13. Race Conditions

| Escenario | Riesgo | Mitigación |
|-----------|--------|------------|
| SSE event + polling terminando simultáneamente | Doble refresh | Coalescing queue (100ms) agrupa ambos en 1 fetch |
| SSE reconecta + REST resync en vuelo | Datos stale sobrescriben frescos | Message merge por ID — el Map actualiza con datos más recientes |
| Usuario cambia conversación A→B + llega event de A | Refresh incorrecto | `activeIdRef.current` se actualiza síncronamente, handler compara contra ref actual |
| loadOlder + realtime event simultáneo | Scroll jump o datos perdidos | loadOlder prepend por ID con dedup. Refresh merge al final. Orden preservado |
| Resync post-connect + event durante resync | Datos duplicados | Merge por ID en `use-inbox-messages.ts:120-141` ya maneja esto |

**[EVIDENCIA]** `use-inbox-realtime.ts` lineas 39-40 usa `useRef` para `activeConversationId` — no stale closure.

---

## 14. Message Merge

**[EVIDENCIA]** `use-inbox-messages.ts` lineas 114-146 — refresh merge strategy:

1. Build `freshMap` (Map<id, InboxMessage>) de datos del servidor
2. Update existing: `prev.map(m => freshMap.get(m.id) ?? m)` — preserva orden, actualiza delivery status
3. Find new: `result.filter(m => !existingIds.has(m.id))` — mensajes que no estaban
4. Remove temp: `updated.filter(m => !m.id.startsWith("temp-"))` — limpia optimistic
5. Append new: `[...withoutTemp, ...toChronological(newMsgs)]`

**Identity**: `message.id` (UUID del backend)
**NO** usar timestamp como identidad — múltiples mensajes pueden tener el mismo `createdAt`

**Sin cambios necesarios** — el merge actual es compatible con SSE.

---

## 15. Load Older Compatibility

**[EVIDENCIA]** `use-inbox-messages.ts` lineas 75-97 — keyset pagination:
- Cursor: `oldest.createdAt` + `oldest.id`
- Dedup: Set de IDs existentes
- Resultado: prepend de mensajes anteriores filtrados

### Riesgo con realtime

Si `refresh()` hace `getInboxMessages(id, { limit: 50 })` y reemplazara todo, se perderían los >50 mensajes históricos ya cargados.

**[EVIDENCIA]** El refresh actual (linea 120-141) **NO reemplaza** — hace merge. Solo actualiza existentes + appends nuevos. Historial preservado.

**Sin cambios necesarios.**

---

## 16. Preserve Loaded History

**[DECISIÓN RECOMENDADA]** Mantener el patrón actual de merge-by-ID.

Si usuario cargó 200 mensajes (4 páginas de loadOlder) y llega SSE:
- Refresh fetch trae últimos 50 (PAGE_SIZE)
- Merge actualiza delivery status de los que ya existen
- Appends solo los verdaderamente nuevos
- Los 150 históricos anteriores quedan intactos

**Verificado**: No hay `setMessages(result)` sin merge en el refresh path.

---

## 17. Scroll Behavior

**[EVIDENCIA]** `InboxTimeline.tsx` lineas 90-142:

| Escenario | Comportamiento | Implementación |
|-----------|---------------|----------------|
| Mensaje nuevo + usuario near bottom (<150px) | Auto-scroll smooth | `scrollToBottom(true)` via `requestAnimationFrame` |
| Mensaje nuevo + usuario leyendo arriba | Botón flotante "Nuevos mensajes" | `setShowNewButton(true)` |
| Click en "Nuevos mensajes" | Scroll smooth al final | `scrollToBottom(true)` + hide button |
| Carga inicial | Scroll instant al final | `scrollToBottom()` sin smooth |
| loadOlder | Sin scroll (prepend) | Mensajes se insertan arriba |

### Con SSE

El `messages.length` change trigger (linea 116-128) ya maneja todos los casos. No importa si el incremento viene de polling o SSE — el mismo effect corre.

**Consideración para message del propio STAFF**: El optimistic `addLocalMessage` ya incrementa `messages.length`, disparando auto-scroll inmediato. SSE + refresh posterior solo actualiza delivery status sin re-scroll.

**Sin cambios necesarios.**

---

## 18. Dalia Experience

Flujo ideal con SSE:

```
Paciente envía "Hola"
→ webhook WhatsApp → backend insert → AFTER_COMMIT → SSE push
→ message_new event (latencia: ~200-500ms)
→ refreshMessages() → API GET → UI render
→ TOTAL: ~500ms-1s

Dalia procesa y responde
→ backend insert → AFTER_COMMIT → SSE push
→ message_new event
→ refreshMessages() → respuesta visible
→ TOTAL: ~500ms-1s después de Dalia

Meta confirma DELIVERED
→ webhook status → backend update → SSE push
→ message_status event
→ refreshMessages() → ticks actualizados
```

**vs actual**: polling 8s = el usuario puede esperar hasta 8s para ver cada paso.

---

## 19. Polling Fallback

**[EVIDENCIA]** `use-inbox-polling.ts` ya implementa todo lo necesario.

### Cuándo se activa

```typescript
useInboxPolling({
  ...callbacks,
  enabled: state !== "connected",  // cualquier estado que no sea connected
});
```

### Intervalos (sin cambios)

| Estado | Lista | Mensajes | Summary |
|--------|-------|----------|---------|
| Active | 15s | 8s | 30s |
| Idle (>2min) | 45s | 30s | 60s |
| Tab hidden | OFF | OFF | OFF |

### Mejora propuesta: backoff en errores

Si REST devuelve error, incrementar intervalo temporalmente en vez de reintentar al mismo ritmo.

---

## 20. User Activity Detection

**[EVIDENCIA]** `use-inbox-polling.ts` lineas 76-87:
- Eventos: `mousedown`, `keydown`, `touchstart`, `scroll`
- Todas con `{ passive: true }` (no bloquea scroll)
- Idle threshold: 2 minutos
- Al detectar actividad: reinicia timers con intervalos activos

**Sin cambios necesarios.** El mecanismo actual es correcto y eficiente.

**[NOTA]** El hook de actividad vive dentro de polling. Con SSE, no se necesita idle detection para el stream — solo para decidir si polling fallback usa intervalos activos o idle.

---

## 21. Visibility API

### Decisión: SSE cuando tab hidden

**OPTION A**: Mantener SSE abierto cuando tab hidden
**OPTION B**: Cerrar SSE, reconectar al visible

**[DECISIÓN RECOMENDADA]** **OPTION B — cerrar SSE cuando hidden, reconectar al visible.**

Razones:
1. Browsers throttle tabs ocultos (timers, network)
2. Backend connection count: cada tab oculta = 1 conexión inactiva
3. SSE events en tab oculta no benefician al usuario (no ve la UI)
4. Resync al volver cubre el gap completamente
5. Contexto clínica: recepcionista tiene múltiples tabs abiertas — solo la activa importa

**Al volver visible**:
1. Obtener ticket nuevo
2. Conectar EventSource
3. REST resync inmediato (conversations + summary + active messages)
4. Resetear idle state (usuario está activo si volvió a la tab)

**[EVIDENCIA]** El comportamiento actual ya cierra SSE en hidden (`use-inbox-sse.ts:133-150`). Se mantiene.

---

## 22. Online / Offline

| Evento | Acción |
|--------|--------|
| `offline` | `eventSource.close()`, clear timers, `state = "disconnected"` |
| `online` | Obtener ticket nuevo → conectar → REST resync |

- NO mostrar toast de error por pérdida temporal
- NO retry loop mientras offline
- Usar `navigator.onLine` + events `online`/`offline`

**[PROPUESTO]** Agregar listeners para `online`/`offline` al hook SSE. Actualmente no existen.

---

## 23. SSE Failure Threshold

### Estrategia

Después de 6 intentos fallidos consecutivos (backoff: 1s → 2s → 4s → 8s → 15s → 15s):

1. `state = "fallback_polling"` — polling toma control
2. Retry SSE en background cada **60 segundos**
3. También retry SSE en: `online` event, `visibilitychange` visible, user interaction después de idle

### Racional

El Inbox debe funcionar **siempre**, aunque SSE esté roto (backend sin el endpoint, proxy que bloquea streaming, etc.). Polling es el safety net permanente.

---

## 24. No Error Spam

| Situación | Acción UI |
|-----------|-----------|
| SSE disconnect temporal (<30s) | Nada |
| SSE en reconnect loop | Nada |
| FALLBACK_POLLING activado | Nada (polling funciona transparentemente) |
| Degradado >5 minutos | Opcional: banner discreto "Actualización en tiempo real no disponible" |
| Offline real | Nada (browser ya muestra indicador) |

**[DECISIÓN RECOMENDADA]** No mostrar ningún indicador en producción para F11. El usuario no necesita saber la diferencia entre SSE y polling — ambos funcionan.

---

## 25. Realtime Status UI

Para F11 MVP: **sin indicador visual en producción**.

Para debug/QA: exponer estado via `console.debug` condicional:
```
[inbox-realtime] state: connected
[inbox-realtime] state: reconnecting (attempt 2/6, next in 4s)
[inbox-realtime] state: fallback_polling
```

Solo con `process.env.NODE_ENV === "development"`.

---

## 26. Authentication Expiry

### JWT expirado durante ticket request

**[EVIDENCIA]** `apiConfig.ts` lineas 141-176: Axios interceptor maneja 401 automáticamente:
1. Intenta `tryRefreshOnce()` via `POST /api/auth/refresh`
2. Si refresh OK → retry request original (ticket)
3. Si refresh fail → `onUnauthorized()` (redirect a login)

**Acción para SSE hook**: Si `createInboxSseTicket()` falla con 401 post-refresh, cerrar SSE y detener reconnect. El auth flow existente redirige al login.

### JWT expirado durante SSE stream

El stream usa ticket, no JWT. El stream sigue vivo independientemente del JWT principal. Cuando el stream cae por cualquier razón, el reconnect pide ticket nuevo, que sí necesita JWT válido — y ahí el interceptor maneja el refresh.

---

## 27. Permission Changes

| Response de POST ticket | Acción |
|------------------------|--------|
| 200 + ticket | Conectar EventSource |
| 401 | Auth flow maneja (refresh → retry) |
| 403 | **STOP** — sin permiso `WHATSAPP_INBOX_VIEW`. No reintentar. `state = "disconnected"` |
| 500+ | Reconnect con backoff normal |

**[DECISIÓN RECOMENDADA]** Agregar flag `permissionDenied` que previene retry automático. Solo resetea si el componente se re-monta (usuario navega fuera y vuelve).

---

## 28. Component Lifecycle

| Evento | Acción |
|--------|--------|
| Mount InboxPage | `useInboxRealtime` → auto-start: POST ticket → EventSource |
| Unmount InboxPage | `eventSource.close()`, clear todos los timers, remove listeners, abort in-flight |
| Conversation change | Actualizar `activeIdRef.current`, NO reconectar SSE |

**No memory leaks**: Todo limpiado en return de useEffect.

---

## 29. Strict Mode / Double Mount

React 18 StrictMode (dev) monta → desmonta → monta effects.

### Protecciones

1. `cleanup()` en return de useEffect cierra EventSource y timers
2. Segundo mount crea conexión nueva (correcto — la primera se cerró)
3. `sourceRef.current` previene EventSource huérfano
4. `retryTimerRef.current` previene timer huérfano

### Riesgo actual

**[EVIDENCIA]** `use-inbox-sse.ts` lineas 122-130: Effect cleanup llama `cleanup()` que cierra todo. Segundo mount llama `connect()` que crea conexión nueva. Seguro.

---

## 30. Multiple Tabs

**V1**: Cada tab abre su propia conexión SSE. Backend soporta múltiples conexiones por clínica.

**Futuro**: BroadcastChannel API para compartir SSE entre tabs. NO implementar en F11.

---

## 31. Active Conversation Switching

**[EVIDENCIA]** `use-inbox-realtime.ts` lineas 39-40:
```typescript
const activeIdRef = useRef(activeConversationId);
activeIdRef.current = activeConversationId;
```

El ref se actualiza síncronamente en cada render. El event handler lee `activeIdRef.current` — siempre el valor más reciente.

Si usuario cambia A→B y llega event de A:
- `activeIdRef.current === "B"` (ya actualizado)
- `event.conversationId === "A"` (del evento)
- `isActiveConversation === false`
- Solo refreshList, NO refreshMessages
- Timeline de B no se altera

**Correcto. Sin cambios.**

---

## 32. Mutation Hooks

**[EVIDENCIA]** `use-inbox-actions.ts` — cada mutación hace refresh manual en `onSuccess`:

| Hook | Refresh en success |
|------|-------------------|
| `useTakeover` | `convDetail.refresh()` + `convList.refresh()` |
| `useRelease` | `convDetail.refresh()` + `convList.refresh()` |
| `useResolve` | `convDetail.refresh()` + `convList.refresh()` |
| `useReopen` | `convDetail.refresh()` + `convList.refresh()` |
| `useSendMessage` | `msgs.refresh()` + `convList.refresh()` |
| `useMarkRead` | (silencioso, sin refresh) |
| `useLinkPatient` | `convDetail.refresh()` + `convList.refresh()` |

**Con SSE**: Mantener el refresh optimista en mutaciones del ESTE usuario. SSE eventualmente emitirá el evento, pero coalescing evitará doble fetch.

**[DECISIÓN RECOMENDADA]** No eliminar refreshes de mutaciones. Son necesarios para UX inmediata del usuario que ejecuta la acción. SSE es para sincronizar OTRAS tabs/usuarios.

---

## 33. Staff Send

**[EVIDENCIA]** `InboxPage.tsx` lineas 143-165:
1. `addLocalMessage(tempMsg)` — aparece inmediatamente en timeline
2. `sendMsg.execute(selectedId, text)` — API call
3. `onSuccess`: `msgs.refresh()` + `convList.refresh()` — reemplaza temp por real

**Con SSE**: Backend emitirá `message_new` (outbound). El refresh por SSE se coalescerá con el refresh ya hecho por `onSuccess`. Coalescing previene doble fetch.

**No degradar UX local.**

---

## 34. Summary

| Canal | Refresh trigger |
|-------|----------------|
| SSE connected | Solo en `summary_update` event |
| SSE disconnected (polling) | Cada 30s (active) / 60s (idle) |

Sidebar badges que dependen de summary se actualizan por el mismo state `summary.summary?.totalUnread`.

---

## 35. Conversation List

Cuando llega `message_new`:
- Backend ya actualizó la conversación (lastMessageAt, unreadCount, etc.)
- Frontend llama `convList.refresh()` → GET `/conversations`
- Backend devuelve lista ordenada con la conversación afectada subida en posición
- Frontend reemplaza lista (linea 87-97 de `use-inbox-conversations.ts`)

**No reconstruir estado manualmente desde SSE payload.** SSE solo dice "algo cambió", REST trae el estado actualizado.

---

## 36. Performance

### Objetivo

| Métrica | Target |
|---------|--------|
| SSE event → UI visible | <1s (dependiendo de REST response time) |
| Fetches por evento (con coalescing) | 1-3 (vs 5-6 sin coalescing) |
| Connections por tab | 1 EventSource + REST on-demand |
| Bandwidth SSE connected | ~0 polling (solo event stream ~100 bytes/evento) |
| Bandwidth polling fallback active | ~300KB/min |
| Bandwidth polling fallback idle | ~60KB/min |

---

## 37. Service Layer

### Agregar

```typescript
// lib/services/inbox/inbox.service.ts
export async function createInboxSseTicket(): Promise<string>
```

### EventSource vive en hook

EventSource se crea y gestiona en `useInboxSSE`, no en el service layer. Razones:
- Long-lived connection (no request-response)
- Necesita React lifecycle (refs, cleanup, effects)
- No pasa por Axios interceptors

---

## 38. Types

### Agregar a `lib/entity/inbox/index.ts`

```typescript
// SSE Event Types
export type InboxRealtimeEventType =
  | "message_new"
  | "message_status"
  | "conversation_update"
  | "summary_update";

export interface MessageNewEventData {
  conversationId: string;
  messageId: string;
  direction: MessageDirection;
}

export interface MessageStatusEventData {
  conversationId: string;
  messageId: string;
  status: Extract<MessageDeliveryStatus, "SENT" | "DELIVERED" | "READ" | "FAILED">;
}

export interface ConversationUpdateEventData {
  conversationId: string;
}

export type SummaryUpdateEventData = Record<string, never>;

export type InboxRealtimeEvent =
  | { type: "message_new"; data: MessageNewEventData }
  | { type: "message_status"; data: MessageStatusEventData }
  | { type: "conversation_update"; data: ConversationUpdateEventData }
  | { type: "summary_update"; data: SummaryUpdateEventData };

export type RealtimeConnectionState =
  | "disconnected"
  | "obtaining_ticket"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "fallback_polling";
```

---

## 39. Event Parsing

```typescript
// Named events — NO usar onmessage genérico
source.addEventListener("message_new", handler);
source.addEventListener("message_status", handler);
source.addEventListener("conversation_update", handler);
source.addEventListener("summary_update", handler);
// heartbeat es SSE comment (: heartbeat) — NO necesita handler
```

### Parsing defensivo

```typescript
function parseEventData<T>(e: MessageEvent): T | null {
  try {
    return JSON.parse(e.data) as T;
  } catch {
    // Log en dev, ignorar en prod — NO romper stream
    if (process.env.NODE_ENV === "development") {
      console.warn("[inbox-sse] Invalid JSON in event:", e.data);
    }
    return null;
  }
}
```

---

## 40. Connected Event

Backend emite evento named `connected` al establecer stream.

### Uso

```typescript
source.addEventListener("connected", () => {
  state = "connected";  // señal autoritativa
  resetRetries();
  triggerResync();
});
```

**[DECISIÓN RECOMENDADA]** Usar `connected` event del backend como señal autoritativa de CONNECTED, no `onopen`. Diferencia:
- `onopen`: transporte HTTP conectado (headers recibidos)
- `connected` event: backend confirmó stream activo y suscrito a eventos de la clínica

Fallback: si `connected` no llega en 5s después de `onopen`, considerar conectado igualmente.

---

## 41. EventSource onopen

Usar `onopen` para marcar `state = "connecting" → (esperando connected event)`.

Si `connected` event llega → `state = "connected"`.
Si 5s pasan sin `connected` → `state = "connected"` igualmente (timeout fallback).

---

## 42. Backoff Reset

Resetear `retryAttempts = 0` cuando:
- Se recibe `connected` event del backend (o fallback timeout 5s post-onopen)
- NO en `onopen` solamente (podría desconectar inmediatamente después)

Esto evita mantener backoff de 15s después de una reconexión exitosa.

---

## 43. Request Cancellation

### Coalescing como solución principal

El debounce de 100ms del coalescing queue ya previene requests superpuestos.

### AbortController opcional

Si dos refreshes del mismo tipo se disparan dentro de los 100ms:
- La queue solo ejecuta 1 fetch
- No necesita AbortController explícito

**[DECISIÓN RECOMENDADA]** No implementar AbortController para F11. Coalescing suficiente.

---

## 44. Event Burst

### Escenario real

Paciente envía "Hola" → Dalia responde:

```
t=0ms    message_new (inbound "Hola")
t=50ms   conversation_update (lastMessageAt changed)
t=100ms  summary_update (unread++)
t=2000ms message_new (outbound Dalia response)
t=2050ms conversation_update
t=2100ms summary_update
```

### Con coalescing (100ms window)

**Batch 1** (t=0-100ms):
- message_new → mark: messages, conversationList
- conversation_update → mark: conversationList (ya marcado)
- summary_update → mark: summary
- **Ejecuta**: 1 refreshMessages + 1 refreshList + 1 refreshSummary = **3 fetches**

**Batch 2** (t=2000-2100ms):
- Mismo resultado: **3 fetches**

**Total**: 6 fetches (vs 12 sin coalescing)

---

## 45. Error Recovery

| Fallo | Acción |
|-------|--------|
| SSE stream sano + REST refresh 500 | NO cerrar SSE. Retry REST en próximo evento o polling cycle |
| SSE stream onerror | Cerrar stream, reconnect con nuevo ticket |
| Ticket POST falla 500 | Backoff, retry |
| Ticket POST falla 403 | STOP — sin permiso |

**Separar errores de transporte de errores de API.**

---

## 46. Initial Mount

Al entrar a `/inbox`:

**En paralelo**:
1. REST: `getInboxConversations()` + `getInboxSummary()` (hooks existentes auto-fetch)
2. SSE: `POST ticket` → `new EventSource`

No esperar SSE para mostrar pantalla. REST data llega primero (~200ms). SSE conecta después (~500ms-1s).

---

## 47. Connection Race During Mount

| Escenario | Prevención |
|-----------|------------|
| REST fetch empieza → SSE conecta → event llega → REST viejo termina después | Message merge por ID actualiza/no sobrescribe. Los datos más recientes ganan porque `freshMap.get(m.id)` prefiere datos frescos |
| SSE event dispara refresh → initial fetch termina → pisa refresh más nuevo | Coalescing queue agrupa ambos. Si llegan en <100ms, solo 1 fetch. Si llegan separados, el segundo fetch trae datos más recientes |

**[EVIDENCIA]** `use-inbox-messages.ts` refresh merge (linea 120-141): `freshMap.get(m.id) ?? m` — datos del servidor siempre tienen prioridad sobre existentes.

---

## 48. Mobile (390px)

Realtime funciona igual en mobile. El layout ya es responsive (sheet-based).

- Lista mobile: refresh actualiza `conversations` → re-render inmediato
- Chat mobile: refresh actualiza `messages` → auto-scroll si near bottom
- No navegación automática al recibir mensaje

**Sin cambios necesarios.**

---

## 49. Tablet/Desktop (768-1440px)

Realtime no causa:
- Layout shift (estado vive en hooks, no en layout)
- Panel reset (selectedId no cambia por SSE events)
- Selected conversation reset (activeIdRef preservado)

**Sin cambios necesarios.**

---

## 50. Polling Auto-Start Bug

**[EVIDENCIA]** Bug anterior: `useInboxPolling` retornaba `{ start, stop }` pero nadie llamaba `start()`.

**Estado actual**: Resuelto. El hook auto-arranca via `useEffect` (linea 101-108 de `use-inbox-polling.ts`). Controlado por `enabled` prop.

**Para F11**: Mantener auto-start. `useInboxRealtime` arranca automáticamente en mount — no requiere interacción del usuario.

---

## 51. Browser Support

EventSource nativo soportado en:
- Chrome 6+, Firefox 6+, Safari 5+, Edge 79+
- iOS Safari 5+, Chrome Android

**NO soportado**: IE11 (no es target de ClinicFlow360)

**Fallback**: Si `typeof EventSource === "undefined"`, ir directo a `fallback_polling`. No polyfill para F11.

---

## 52. Local Development

**[EVIDENCIA]** `apiConfig.ts` linea 102: `baseURL: process.env.NEXT_PUBLIC_API_URL`

SSE debe usar la misma variable de entorno:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const ticketUrl = `${apiUrl}/whatsapp/inbox/events/ticket`;
const sseUrl = `${apiUrl}/whatsapp/inbox/events?ticket=${ticket}`;
```

No hardcodear localhost. CORS ya configurado en backend para dev.

---

## 53. HTTPS

Producción: HTTPS frontend → HTTPS backend. EventSource funciona sobre HTTPS nativo (no WebSocket, no mixed content).

Dev: HTTP permitido (EventSource funciona sobre HTTP también).

---

## 54. Observability Frontend

### Dev mode

```
[inbox-realtime] state: obtaining_ticket
[inbox-realtime] state: connecting
[inbox-realtime] state: connected (ticket obtained in 120ms)
[inbox-realtime] event: message_new conv=abc123 (active)
[inbox-realtime] coalesced: messages+list+summary → 3 fetches
[inbox-realtime] state: reconnecting (attempt 1/6, next in 1.2s)
```

### NO loggear
- Ticket value
- JWT value
- Message content
- Conversation IDs en producción

---

## 55. Metrics Future

Opcional post-F11:
- SSE connection success rate
- Reconnect count per session
- Time spent in fallback_polling
- Event-to-UI-update latency

No requerido para F11 MVP.

---

## 56. Testing Strategy

### Auth (4 tests)

| # | Test | Expect |
|---|------|--------|
| 1 | `createInboxSseTicket()` llamado al conectar | Service invocado con JWT |
| 2 | Ticket válido → EventSource creado con URL correcta | `new EventSource(url?ticket=...)` |
| 3 | Ticket nunca persistido | No localStorage/sessionStorage/cookie |
| 4 | Error → nuevo ticket solicitado (no reusar) | POST ticket llamado de nuevo |

### Connection (9 tests)

| # | Test | Expect |
|---|------|--------|
| 5 | Auto-start on mount | State transitions: disconnected → obtaining_ticket → connecting |
| 6 | Cleanup on unmount | `eventSource.close()` + timers cleared |
| 7 | Solo 1 EventSource activo | `sourceRef.current` reemplazado, viejo cerrado |
| 8 | Reconnect crea nuevo EventSource + nuevo ticket | POST ticket + new EventSource |
| 9 | Backoff incrementa: 1s, 2s, 4s, 8s, 15s | Delays medidos |
| 10 | Connected event resetea backoff a 0 | `retryAttempts = 0` |
| 11 | Connection timeout 10s si no `onopen` | State → reconnecting |
| 12 | `connected` event marca state = connected | State transition verificada |
| 13 | Backoff con jitter ±20% | Delays within expected range |

### Events (7 tests)

| # | Test | Expect |
|---|------|--------|
| 14 | `message_new` conv activa → refreshMessages + refreshList | Callbacks invocados |
| 15 | `message_new` conv inactiva → refreshList only | refreshMessages NO invocado |
| 16 | `message_status` conv activa → refreshMessages | Callback invocado |
| 17 | `message_status` conv inactiva → nada | Ningún callback |
| 18 | `conversation_update` → refreshList + refreshDetail si activa | Callbacks correctos |
| 19 | `summary_update` → refreshSummary | Callback invocado |
| 20 | JSON inválido → ignorado sin romper stream | No throw, stream continúa |

### Coalescing (2 tests)

| # | Test | Expect |
|---|------|--------|
| 21 | `message_new` + `conversation_update` en <100ms → 1 refreshList | Solo 1 invocación |
| 22 | Multiple `summary_update` en <100ms → 1 refreshSummary | Solo 1 invocación |

### Polling (6 tests)

| # | Test | Expect |
|---|------|--------|
| 23 | SSE connected → polling disabled | No setInterval creados |
| 24 | SSE failure → polling enabled | Intervalos activos |
| 25 | Active intervals: 15s/8s/30s | Valores correctos |
| 26 | Idle intervals: 45s/30s/60s | Valores correctos |
| 27 | Tab hidden → polling OFF | Timers cleared |
| 28 | Tab visible → resync + polling restart | Callbacks invocados |

### Idle (2 tests)

| # | Test | Expect |
|---|------|--------|
| 29 | 2min sin interacción → idle mode | Intervalos cambian a idle |
| 30 | Interacción → active mode | Intervalos cambian a active |

### Network (2 tests)

| # | Test | Expect |
|---|------|--------|
| 31 | Offline → stream closes + polling stops | State = disconnected |
| 32 | Online → reconnect + resync | POST ticket + EventSource + refreshes |

### Scroll (3 tests)

| # | Test | Expect |
|---|------|--------|
| 33 | New message + near bottom → auto scroll | scrollToBottom(true) |
| 34 | New message + reading history → no jump | showNewButton = true |
| 35 | "Nuevos mensajes" click → scroll + hide | scrollToBottom + button hidden |

### History (3 tests)

| # | Test | Expect |
|---|------|--------|
| 36 | loadOlder preservado tras realtime refresh | Mensajes anteriores intactos |
| 37 | No mensajes duplicados | Dedup por ID funciona |
| 38 | Orden oldest→newest preservado | Array sorted correctly |

### Permissions/Auth (3 tests)

| # | Test | Expect |
|---|------|--------|
| 39 | 403 en ticket → stop reconnect | permissionDenied flag, no retry |
| 40 | 401 en ticket → auth flow handles | Refresh token → retry |
| 41 | StrictMode: no double EventSource | Solo 1 conexión activa |

### Failure (2 tests)

| # | Test | Expect |
|---|------|--------|
| 42 | REST refresh falla 500 → SSE sigue vivo | Stream no se cierra |
| 43 | Invalid SSE JSON → ignored safely | No throw, log dev only |

**Total: 43 tests**

---

## 57. Implementation Phases

### F11.0 — Audit + Contracts (este documento)
- **Objetivo**: Definir arquitectura, tipos, contrato con backend
- **Archivos**: Este documento
- **Done**: Documento aprobado

### F11.1 — Types + Ticket Service
- **Objetivo**: Tipos SSE + servicio de ticket
- **Archivos**: `lib/entity/inbox/index.ts`, `lib/services/inbox/inbox.service.ts`
- **Tests**: 1-4 (auth)
- **Riesgo**: Bajo
- **Done**: Tipos compilan, service invocable

### F11.2 — useInboxSSE rewrite (ticket + state machine)
- **Objetivo**: Reescribir SSE hook con ticket flow y state machine
- **Archivos**: `lib/hooks/inbox/use-inbox-sse.ts`
- **Tests**: 5-13 (connection)
- **Riesgo**: Medio (state machine correctness)
- **Done**: Hook conecta con ticket, reconecta con nuevo ticket, state transitions correctas

### F11.3 — Reconnect / Backoff / Network
- **Objetivo**: Backoff con jitter, online/offline, connection timeout
- **Archivos**: `lib/hooks/inbox/use-inbox-sse.ts`
- **Tests**: 9-10, 31-32
- **Riesgo**: Medio (edge cases de red)
- **Done**: Reconnect robusto, offline/online manejado

### F11.4 — Event Invalidation + Coalescing
- **Objetivo**: Handler de eventos con coalescing queue
- **Archivos**: `lib/hooks/inbox/use-inbox-realtime.ts`
- **Tests**: 14-22 (events + coalescing)
- **Riesgo**: Medio (timing del debounce)
- **Done**: Eventos disparan refreshes correctos, sin duplicados

### F11.5 — Polling Fallback Integration
- **Objetivo**: Polling se activa/desactiva según SSE state
- **Archivos**: `lib/hooks/inbox/use-inbox-realtime.ts` (ya funciona, validar)
- **Tests**: 23-28 (polling)
- **Riesgo**: Bajo (ya implementado)
- **Done**: Polling enabled solo si `state !== "connected"`

### F11.6 — Visibility / Idle
- **Objetivo**: Tab hidden cierra SSE, visible reconecta + resync
- **Archivos**: `lib/hooks/inbox/use-inbox-sse.ts`, `use-inbox-polling.ts`
- **Tests**: 27-30
- **Riesgo**: Bajo (patterns existentes)
- **Done**: Tab oculta = zero resource usage, visible = instant resync

### F11.7 — Message Merge / History / Scroll Validation
- **Objetivo**: Validar que merge, history y scroll funcionan con realtime
- **Archivos**: Ningún cambio esperado (validar solamente)
- **Tests**: 33-38
- **Riesgo**: Bajo
- **Done**: Historial preservado, no duplicados, scroll correcto

### F11.8 — Responsive + QA
- **Objetivo**: Validar mobile/tablet, ejecutar QA scenarios
- **Archivos**: Ningún cambio esperado
- **Tests**: QA manual (sección 58)
- **Riesgo**: Bajo
- **Done**: Todos los QA scenarios pasan

### F11.9 — Production Smoke Test
- **Objetivo**: Verificar en ambiente desplegado
- **Archivos**: Ninguno
- **Done**: SSE conecta en producción, polling fallback funciona si SSE falla

---

## 58. QA Scenarios

### CASO A: Paciente envía mensaje
- Paciente envía "Hola"
- **Esperado**: <1s después del event, mensaje aparece en timeline (si conversación activa) y en lista de conversaciones

### CASO B: Dalia responde
- Dalia genera respuesta automática
- **Esperado**: Respuesta aparece sin esperar polling cycle

### CASO C: Delivery status
- Meta confirma DELIVERED → READ
- **Esperado**: Ticks cambian casi instantáneamente (doble check gris → azul)

### CASO D: 2 browsers misma clínica
- Abrir Inbox en Chrome y Firefox
- **Esperado**: Ambos actualizan cuando llega mensaje

### CASO E: Staff responde desde Browser A
- Staff envía mensaje en Browser A
- **Esperado**: Browser B recibe actualización vía SSE

### CASO F: Backend SSE cae
- Simular caída de SSE endpoint
- **Esperado**: Polling entra automáticamente. Inbox sigue funcionando. Sin toast de error.

### CASO G: Backend SSE vuelve
- Restaurar SSE endpoint
- **Esperado**: Frontend obtiene ticket nuevo, reconecta, REST resync, polling se apaga

### CASO H: Network offline 30s
- Desconectar WiFi 30 segundos
- **Esperado**: Sin error spam. Al reconectar: SSE reconecta + resync inmediato

### CASO I: Tab hidden 5 minutos → volver
- Cambiar a otra tab por 5 minutos
- **Esperado**: Al volver, datos actualizados inmediatamente (REST resync)

### CASO J: Historial cargado + mensaje nuevo
- Cargar 3 páginas de historial (loadOlder x3 = ~150 msgs)
- Llega mensaje nuevo
- **Esperado**: Historial cargado NO desaparece. Mensaje nuevo se appenda al final

---

## 59. Success Metrics

| Métrica | Antes | Después (SSE) | Después (fallback) |
|---------|-------|---------------|-------------------|
| Message latency | 3-8s | <1s | 8s active / 30s idle |
| Conversation update | 5-15s | <1s | 15s active / 45s idle |
| Summary update | 10-30s | <1s | 30s active / 60s idle |
| Polling requests (SSE sano) | Constante | **0** | N/A |
| Tab hidden bandwidth | Constante | **0** | **0** |

---

## 60. Non-Goals

- NO cambiar backend (F11 es frontend-only)
- NO WebSocket (SSE es suficiente para server→client push)
- NO Zustand/Redux (hooks pattern actual es adecuado)
- NO BroadcastChannel (V2 optimization)
- NO Service Worker
- NO push notifications
- NO presence / typing indicators
- NO optimistic message architecture nueva
- NO cambiar layout del Inbox
- NO refactor general
- NO mobile app realtime

---

## 61. Definition of Done

F11 frontend terminado cuando:

- [ ] SSE auto-start on mount
- [ ] Ticket temporal seguro (no JWT en URL, no persistido)
- [ ] Reconnect con ticket NUEVO + exponential backoff + jitter
- [ ] State machine: disconnected → obtaining_ticket → connecting → connected → reconnecting → fallback_polling
- [ ] Selective invalidation por tipo de evento
- [ ] Event coalescing (100ms debounce)
- [ ] Fallback polling (active/idle intervals)
- [ ] Tab hidden → SSE close + polling OFF
- [ ] Tab visible → ticket + reconnect + REST resync
- [ ] Offline → cleanup. Online → reconnect
- [ ] Messages realtime (message_new → refresh si activa)
- [ ] Dalia responses realtime
- [ ] Delivery status realtime (message_status)
- [ ] Summary realtime (summary_update)
- [ ] History preserved (loadOlder no se pierde)
- [ ] No duplicates (merge por ID)
- [ ] No scroll jumps
- [ ] 403 → stop reconnect (permiso denegado)
- [ ] 401 → auth flow existente maneja
- [ ] No token leaks (ticket temporal, no loggear)
- [ ] Responsive intact (mobile/tablet/desktop)
- [ ] TypeScript sin errores nuevos
- [ ] ESLint sin warnings nuevos
- [ ] Build exitoso
- [ ] 43 tests pasan
- [ ] 10 QA scenarios verificados

---

## 62. Resumen Ejecutivo Final

### 1. Arquitectura realtime recomendada
SSE con ticket temporal + polling adaptativo fallback. Hook hierarchy: `useInboxRealtime` → `useInboxSSE` + `useInboxPolling`.

### 2. Hooks finales
- `useInboxSSE` (reescribir): ticket flow + state machine
- `useInboxRealtime` (actualizar): coalescing + summary_update
- `useInboxPolling` (sin cambios grandes): ya funciona

### 3. Connection state machine
6 estados: `disconnected` → `obtaining_ticket` → `connecting` → `connected` → `reconnecting` → `fallback_polling`

### 4. Ticket flow
POST ticket con JWT → ticket temporal single-use TTL 60s → EventSource URL con ticket (NO JWT)

### 5. Reconnect strategy
Exponential backoff 1s→2s→4s→8s→15s con ±20% jitter. Max 6 intentos → fallback_polling. Retry SSE cada 60s en background.

### 6. Event handling matrix
message_new → messages+list+(summary via coalescing). message_status → messages if active. conversation_update → list+detail if active. summary_update → summary.

### 7. Coalescing strategy
100ms debounce window. Queue de invalidación marca resources. Ejecuta 1 fetch por resource marcado.

### 8. Active conversation behavior
`activeIdRef.current` (ref, no state). Eventos solo refrescan messages/detail de conversación activa.

### 9. Message merge/history
Merge por ID preserva historial cargado. Refresh actualiza delivery status + appends nuevos. loadOlder intacto.

### 10. Scroll behavior
Sin cambios. Auto-scroll si near bottom, "Nuevos mensajes" button si leyendo arriba.

### 11. Polling fallback
Active: 15s/8s/30s. Idle: 45s/30s/60s. Hidden: OFF. Se activa solo cuando SSE no está CONNECTED.

### 12. Idle detection
2 min sin mousedown/keydown/touchstart/scroll → intervalos lentos. Ya implementado.

### 13. Visibility strategy
Hidden: cerrar SSE + pausar polling. Visible: ticket nuevo + reconectar + REST resync. Zero resources en tab oculta.

### 14. Offline/online
Offline: cleanup todo. Online: ticket + reconnect + resync. Sin error spam.

### 15. Auth/permission
401 → auth flow existente (refresh token → retry). 403 → stop, no reintentar SSE.

### 16. Components/files impactados
3 archivos modificados, 2 con tipos nuevos. 0 componentes visuales cambian.

### 17. Fases F11
10 fases: F11.0 (audit) → F11.9 (production smoke test)

### 18. Tests
43 tests automatizados + 10 QA scenarios manuales

### 19. QA manual
10 escenarios cubriendo: realtime, fallback, offline, history, multi-tab, permissions

### 20. Riesgos
- State machine correctness (mitigado con tests)
- Coalescing timing (mitigado con tests + configurable window)
- Ticket endpoint no disponible (mitigado con fallback polling)

### 21. Decisiones abiertas
- Indicador visual de SSE status en producción (recomendado: NO para F11)
- BroadcastChannel para multi-tab (recomendado: NO para F11, V2)
- AbortController para requests duplicados (recomendado: NO, coalescing suficiente)

### 22. Confirmación

**NO se implementó código.**
**NO se hizo commit.**
**NO se hizo push.**
**Solo se creó este documento de planificación.**
