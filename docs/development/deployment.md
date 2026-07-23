# Despliegue

## Estado verificado

El repositorio no contiene Dockerfile, manifiestos de infraestructura ni
workflows CI/CD. Esta guía define el contrato mínimo del frontend; la plataforma
concreta debe documentarse cuando se incorpore.

## Requisitos

- Node.js 18.18 o superior, fijado a una versión reproducible.
- Yarn 1.22.22.
- Acceso durante build a las dependencias ya bloqueadas por `yarn.lock`.
- Backend compatible y accesible desde navegador y route handlers.
- HTTPS en producción y proxy que preserve `x-forwarded-proto`.

## Variables

| Variable | Fase | Exposición | Uso |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | build/runtime cliente | pública | base URL Axios |
| `API_URL` | runtime servidor | privada | refresh/logout server-side; fallback a la pública |
| `NEXT_PUBLIC_AUTH_DEBUG` | build | pública | diagnóstico; deshabilitar en producción |
| `NEXT_PUBLIC_SUPABASE_*` | build | pública | legacy; no extender |
| `NEXT_DIST_DIR` | build/start | servidor | `.next-build` en scripts productivos |

Las variables `NEXT_PUBLIC_*` quedan congeladas en el bundle. Promover el mismo
artefacto entre entornos solo es seguro si la URL pública es igual o se adopta
una estrategia de configuración runtime.

## Construcción y arranque

```bash
yarn install --frozen-lockfile
yarn typecheck
yarn lint
yarn build
yarn start
```

`yarn build` escribe en `.next-build` para no interferir con `.next` de
desarrollo. `yarn start` debe ejecutarse con el mismo directorio y variables.

El build puede finalizar aunque existan errores TS/ESLint porque
`next.config.mjs` los ignora. Por eso `typecheck` y `lint` deben ser etapas
separadas y bloqueantes en CI.

## Pipeline mínimo recomendado

El siguiente orden es una recomendación pendiente de automatización:

1. checkout limpio;
2. Node/Yarn fijados y cache por hash de `yarn.lock`;
3. `yarn install --frozen-lockfile`;
4. `yarn typecheck`;
5. `yarn lint`;
6. `yarn build`;
7. empaquetar source necesario, `public/`, `.next-build` y runtime;
8. desplegar artefacto inmutable;
9. ejecutar smoke tests;
10. promover o revertir.

## Smoke tests

- `/login` carga branding sin sesión.
- login → OTP → dashboard funciona.
- una ruta protegida redirige al login sin cookie.
- refresh recupera una request protegida sin bucle.
- logout impide volver a una ruta autenticada.
- dashboard y una lista principal consumen el backend correcto.
- permisos ocultan/bloquean acciones y backend devuelve 403 al forzarlas.
- upload, dictado y odontograma se prueban si cambiaron.
- cabeceras de seguridad aparecen en HTTPS.

## Proxy, cookies y CORS

- Terminar TLS antes de servir la aplicación.
- Propagar `x-forwarded-proto=https` para que las cookies se marquen `Secure`.
- Permitir origen, métodos y headers necesarios en el backend sin comodines con
  credenciales.
- No cachear respuestas autenticadas ni HTML con datos de otra clínica.
- Mantener conectividad server-side desde Next hacia `API_URL`.

## Rollback

- Conservar al menos el artefacto y variables de la versión anterior.
- Preferir contratos API aditivos para permitir frontend N y N-1.
- No revertir frontend si una migración destructiva de backend ya eliminó
  compatibilidad.
- Registrar versión frontend, versión backend y motivo de rollback.

## Antes de producción

- confirmar dominio, API y CORS;
- confirmar HTTPS y Secure cookies;
- desactivar debug;
- verificar CSP Report-Only y destino de reportes si existe;
- comprobar que no se empaquetaron `.env`, mapas privados o datos locales;
- documentar plataforma, owners, observabilidad y procedimiento de rollback.
