# Clinic Flow 360 — instrucciones para Codex/IA

## Alcance y contexto mínimo

Este repositorio es un único frontend independiente (`clinic-flow-360`).
`app/`, `components/` y `lib/` son partes de la aplicación, no proyectos separados.
El backend Spring Boot está fuera de este repositorio: no modificarlo por inferencia.
Inspeccionar primero `git status`, el manifiesto/configuración relevante y pocos
archivos vecinos. Buscar con `rg`; no recorrer todo el código ni cargar todas las
guías para un cambio pequeño. Preservar cambios previos del usuario.

## Stack y arquitectura observados

- Next.js **15.5.19** App Router; React **18**, TypeScript **5** estricto;
  Yarn **1.22.22** y `yarn.lock`. Los rangos exactos están en `package.json`;
  las resoluciones están en el lockfile. No mezclar gestores ni lockfiles.
- `app/`: rutas, layouts y route handlers; `components/features/`: UI por dominio;
  `components/ui/`: primitivas compartidas; `components/layout/`: composición global.
- Flujo habitual: página → componente → hook → servicio → API; tipos/DTO en
  `lib/entity/`, filtros en `lib/query/`, validaciones en `lib/validation/`.
  Algunos hooks viven dentro de features: seguir el patrón del área.
- HTTP de cliente en `lib/services/` con Axios (`apiConfig.ts`, `baseService.ts`).
  `baseService` puede devolver `err.response` o `undefined`: validar status/datos.
  Auth server-side usa `app/api/auth/` y `lib/auth/server/` con `fetch`;
  conservar esa frontera y no sustituirla por server actions.
- Estado: Context, Zustand 5 y TanStack Query 5 en facturación. Preservar keys,
  invalidación, contratos y conmutación mock/API de `lib/services/billing/`.
- UI mixta: Tailwind 4, Radix/shadcn/Bento y Ant Design 6 existente.
  Código nuevo usa primitivas locales; no introducir AntD ni migraciones masivas.
- Forms: React Hook Form + Zod 3; feedback mediante `lib/utils/notify.ts`;
  iconos Lucide. Usar i18n existente en `lib/i18n/` y `lib/contexts/i18n-context.tsx`;
  mantener copy español y traducciones del área. Reutilizar tokens semánticos.
- Persistencia principal mediante API externa; no hay schema ni migraciones de BD
  propios. Preservar compatibilidad del JSON del odontograma y sus estados/autosave.

## Calidad y límites

Aplicar SOLID/Clean Code pragmáticos: responsabilidades concretas, nombres claros,
bajo acoplamiento, cohesión, errores coherentes y reutilización pertinente.
Esto no autoriza nuevas capas, interfaces, cambios de arquitectura, contratos o
refactors fuera de alcance. Reportar deuda incidental; hacer el cambio mínimo correcto.
Respetar aliases de `tsconfig.json`, exports públicos y separación server/client.
Storage del navegador se lee tras montar (`useEffect`), no durante render SSR.
Fechas/horas de formularios usan utilidades de `lib/datetime.ts` y hora local;
no introducir conversiones UTC que cambien el día clínico.

No exponer secretos, tokens, credenciales ni datos clínicos en logs, fixtures o
documentación. `NEXT_PUBLIC_*` es público; configuración de servidor como `API_URL`
no debe trasladarse al cliente. Cloudinary se integra vía backend.
La presencia de cookie en middleware no demuestra autorización: revisar permisos
y controles del servidor para auth/API. CSP actual es report-only, no bloqueo.
En pagos/facturación revisar idempotencia, moneda, permisos y errores; en uploads,
validación y exposición de archivos. No inventar reglas clínicas ni endpoints.
No instalar herramientas, actualizar dependencias, cambiar producción o hacer
commit/push como efecto lateral de una tarea de configuración.

## Comandos confirmados y Definition of Done

Ejecutar desde la raíz. Si `yarn` no está en PATH, usar `corepack yarn` (verificado
en este entorno). Si faltan dependencias, informar antes de interpretar un fallo
como regresión; no instalar automáticamente para cambios de documentación.

| Objetivo | Comando |
|---|---|
| Desarrollo | `yarn dev` (Turbopack), `yarn dev:webpack` (alternativa) |
| Tipos | `yarn typecheck` |
| Lint | `yarn lint` (ESLint 8, configuración legacy) |
| Pruebas | `yarn test`; selección: `yarn test lib/services/billing/billing.contract.test.ts` |
| Pruebas interactivas | `yarn test:watch` |
| Build / servir build | `yarn build` / `yarn start` (salida `.next-build`) |
| Contrato de dictado | `yarn check:dictation-contract` |

Vitest 3 usa jsdom, Testing Library, `vitest.setup.ts` y aliases de TS.
El chequeo de dictado requiere el schema del repo hermano `backend-clinic`:
si falta, el script termina con aviso y éxito; reportarlo como **omitido**, no validado.
**El build ignora errores TypeScript y ESLint:** no sustituye typecheck/lint.

- Docs/config de agentes: revisar diff, enlaces, rutas, comandos y consistencia;
  no ejecutar build/tests de aplicación sin razón.
- TS/services/hooks: typecheck, lint y pruebas relevantes al comportamiento.
  Añadir pruebas solo si cubren una regresión o comportamiento significativo.
- UI/forms: además, comprobar loading/error/empty, submit, permisos, teclado/foco,
  móvil/escritorio y temas cuando afecten al cambio.
- Rutas/layouts/config runtime: build y navegación directa/refresh cuando aplique.
- Auth/pagos/datos: validar permitido/denegado, sesión expirada, errores de red,
  compatibilidad y concurrencia/idempotencia según el riesgo.
- Cerrar con self-review y diff acotado; reportar comandos/resultados y lo no
  verificado. No atribuir un fallo a deuda previa sin evidencia comparable.

## Escala, Graphify y delegación

**Single agent by default, Graphify on uncertainty, subagents on risk.**

| Nivel | Flujo proporcional |
|---|---|
| TRIVIAL | Texto/config mínima → cambio → comprobación local. Sin Graphify/subagentes. |
| SMALL | Inspección dirigida → cambio localizado → validación → self-review. |
| MEDIUM | Plan conciso por capas → implementar → tests/validación pertinente; Graphify solo si el impacto no está claro. |
| LARGE | Auth, pagos, concurrencia, integración o impacto transversal → delimitar riesgo → Graphify si aporta → especialista si persiste necesidad → implementación y revisión pertinente. |

Elegir el nivel más bajo seguro. `graphify-out/` preexistente es contexto opcional,
no fuente de verdad: puede estar desactualizado. Graphify está disponible en esta
máquina; comprobar disponibilidad en otras. Consultarlo solo para relaciones o
impacto inciertos, o petición explícita. Si `rg` y archivos concretos bastan,
omitirlo. No leer `graph.json` entero, recorrer su salida recursivamente ni
reconstruir el grafo automáticamente; contrastar hallazgos con el código actual.

No crear agentes por tecnología. Un especialista temporal (seguridad, contratos,
concurrencia o review) debe tener pregunta concreta, valor, contexto mínimo,
archivos permitidos, restricciones y resultado esperado. Preferir read-only;
no repetir descubrimiento. Parent integra hallazgos y conserva responsabilidad.
Paralelizar solo responsabilidades independientes; nunca editar los mismos
archivos simultáneamente. No hay agentes ni skills permanentes locales requeridos.

## Documentación a demanda

Consultar `docs/development/README.md` para elegir una guía según la tarea;
no cargar todo el índice por defecto. La configuración/código actual determina
hechos técnicos; estas instrucciones gobiernan el trabajo de Codex en el repo.
Referencias históricas a skills/agentes no demuestran que estén instalados.
No hay CI/CD ni contenedores versionados detectados; Vercel Analytics no prueba
que Vercel sea el hosting. No asumir despliegues o validaciones automáticas.
