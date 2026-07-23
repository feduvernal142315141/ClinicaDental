# Seguridad

## Modelo de confianza

El navegador y el frontend no son una frontera de seguridad. El backend debe
autenticar, autorizar, validar y aislar cada clínica. Los checks de UI evitan
acciones confusas, pero un usuario puede modificar JavaScript y requests.

Datos clínicos, adjuntos, credenciales, tokens, diagnósticos y datos personales
se consideran sensibles.

## Sesión actual

1. Login cifra el password con la clave pública del backend y solicita OTP.
2. La validación OTP devuelve access y refresh token.
3. `/api/auth/session` crea cookies.
4. El access token se usa desde JavaScript para el Bearer de Axios.
5. El refresh token permanece HttpOnly.
6. Ante 401, el cliente llama `/api/auth/refresh`; peticiones concurrentes
   comparten la misma promesa.
7. Logout avisa al backend best-effort y limpia cookies/estado local.

Cookies actuales:

- `clinic_access_token`: legible por el cliente, `SameSite=Lax`;
- `clinic_refresh_token`: HttpOnly, `SameSite=Lax`;
- `loggedUser`: HttpOnly y usado por middleware;
- `Secure`: activado cuando la request o `x-forwarded-proto` indican HTTPS.

No cambiar nombres, flags ni refresh en un solo lado. Auth, middleware, route
handlers, interceptor y helpers forman un único flujo.

## Reglas obligatorias

- Exigir HTTPS; RSA no reemplaza TLS.
- No registrar tokens, passwords, OTP ni payloads clínicos.
- No enviar secretos mediante `NEXT_PUBLIC_*`.
- Mantener refresh token HttpOnly.
- Validar redirect y parámetros de ruta; no construir URLs externas con entrada
  sin validar.
- Mantener autorización en backend y comprobar permisos en UI.
- Limitar archivos por tipo/tamaño y tratar nombre/MIME como no confiables.
- No usar `dangerouslySetInnerHTML` con contenido remoto sin sanitización.
- Normalizar mensajes para no filtrar stack traces, SQL, Java o infraestructura.
- Limpiar storage sensible al cerrar sesión.

## Cabeceras

`next.config.mjs` aplica:

- HSTS;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `X-Frame-Options: SAMEORIGIN`;
- Permissions Policy con cámara/geolocalización bloqueadas y micrófono propio;
- CSP en modo `Report-Only`.

La CSP permite actualmente `unsafe-inline` y `unsafe-eval` por compatibilidad
con la UI y desarrollo. No afirmar que la aplicación tiene CSP enforcing.

## Variables y secretos

`NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_AUTH_DEBUG` quedan embebidas en el bundle.
Las variables legacy de Supabase también son públicas y no deben extenderse.

`API_URL` es una alternativa server-only soportada por los route handlers de
refresh/logout. Preferirla en producción para la comunicación servidor-backend,
manteniendo `NEXT_PUBLIC_API_URL` solo para el cliente.

No documentar valores reales ni copiar `.env`. Mantener únicamente nombres y
propósito en `.env.example`.

## Privacidad clínica

- Solicitar solo los campos necesarios.
- Evitar caches persistentes de expedientes y diagnósticos.
- No incluir PII en analytics, logs, nombres de eventos o URLs.
- No exponer adjuntos mediante URLs públicas permanentes sin decisión de backend.
- Confirmar aislamiento por `clinicId` en backend; ocultarlo en UI no basta.
- Preservar historial y versiones del odontograma.

## Riesgos de endurecimiento conocidos

No son autorización para un refactor incidental; deben tratarse como tareas
dedicadas:

1. reducir la exposición XSS del access token legible por JavaScript;
2. eliminar la retención temporal del password OTP en `sessionStorage`;
3. promover CSP a enforcing con nonces y orígenes cerrados;
4. añadir pruebas automáticas de refresh, expiración y permisos;
5. revisar CSRF al evolucionar hacia auth basada enteramente en cookies;
6. asegurar que logs de producción no habiliten `NEXT_PUBLIC_AUTH_DEBUG`.

## Revisión de seguridad

Todo cambio en auth, permisos, uploads, HTML rico, voz o datos clínicos debe
verificar al menos:

- autenticado/no autenticado;
- autorizado/403;
- token expirado y refresh fallido;
- manipulación de ID y aislamiento por clínica;
- entradas grandes, malformadas y nulas;
- ausencia de secretos/PII en consola y analytics;
- limpieza de estado tras logout.
