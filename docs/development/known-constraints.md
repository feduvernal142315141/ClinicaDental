# Restricciones y deuda conocida

Esta lista evita convertir excepciones actuales en patrones nuevos. No autoriza
arreglarlas fuera del alcance de una tarea.

## Calidad y entrega

- No hay runner de pruebas ni cobertura automatizada.
- No hay CI/CD versionado.
- El build ignora errores de TypeScript y ESLint.
- No está fijada una versión exacta de Node en archivos de runtime.

## UI

- Coexisten Bento/Radix/shadcn y Ant Design.
- Hay importaciones directas de AntD además de wrappers locales.
- `app/globals.css` contiene compatibilidad visual de ambos sistemas.
- La migración debe hacerse por feature y con validación visual, no mediante
  sustitución global.

## Servicios y contratos

- `baseService` captura errores y devuelve `err.response`, por lo que los
  consumers deben validar explícitamente.
- Coexisten tres dialectos de filtros históricos y el árbol booleano nuevo.
- Algunas llamadas usan `apiInstance` directo por respuestas Blob/multipart o
  deuda local.
- Los shapes de backend no son completamente uniformes.

## Auth y seguridad

- El access token es legible por JavaScript para construir el Bearer.
- El flujo OTP conserva temporalmente el password en `sessionStorage`.
- CSP está en Report-Only y permite `unsafe-inline`/`unsafe-eval`.
- Faltan pruebas automáticas de refresh, concurrencia y permisos.

## Datos

- No existe schema de base de datos en este repo.
- El odontograma persiste un JSON opaco versionado y requiere compatibilidad
  hacia atrás.
- Supabase aparece solo como legado/configuración; no extenderlo.
- El barrel `components/features/odontogram/types.ts` reexporta servicios de
  dominio mientras `OdontogramColorService` y `ToothSymbolService` importan
  tipos por el alias de UI. Esto forma ciclos de importación; resolverlos en una
  tarea dedicada haciendo que los servicios dependan de los tipos canónicos del
  dominio, sin romper los exports públicos.

## Consistencia

- La UI es principalmente española, pero `app/layout.tsx` declara `lang="en"`.
- Existen documentos históricos que describen rutas, skills o herramientas no
  presentes.
- Ciertas features colocan hooks dentro de `components/features/*` y otras en
  `lib/hooks/*`; seguir el patrón local.

## Cómo tratar esta lista

1. No copiar una excepción a código nuevo.
2. Encapsular compatibilidad en la frontera propietaria.
3. Crear una tarea dedicada si el riesgo exige migración.
4. Añadir pruebas o smoke checks antes de retirar compatibilidad.
5. Actualizar esta lista cuando la deuda se resuelva o cambie.
