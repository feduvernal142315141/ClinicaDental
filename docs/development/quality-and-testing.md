# Calidad y pruebas

## Estado actual

Hay Vitest 3 con jsdom, React Testing Library y `vitest.setup.ts`. Se detectaron diez archivos `*.test.ts`/`*.test.tsx` de facturación (services, hooks, utilidades y componentes). No se verificó cobertura global ni se detectó CI versionado.

## Compuertas disponibles

```bash
yarn typecheck
yarn lint
yarn build
yarn test
# Selección concreta:
yarn test lib/services/billing/billing.contract.test.ts
yarn check:dictation-contract
```

- `typecheck`: valida TypeScript estricto sin emitir.
- `lint`: usa la configuración ESLint legacy de Next.
- `test`: Vitest; seleccionar casos relevantes en cambios acotados.
- `check:dictation-contract`: compara con el schema del backend hermano; si no existe, el aviso con exit 0 significa omitido, no validado.
- Si falta el binario `yarn`, `corepack yarn` está disponible en el entorno inspeccionado.
- `build`: valida compilación, rutas y generación, pero ignora errores de TS y
  ESLint por configuración.

Para documentación y skills, validar además enlaces locales, frontmatter y
ausencia de placeholders.

## Validación proporcional

| Cambio | Validación mínima |
|---|---|
| documentación/skill | diff, enlaces, rutas; validator solo si se crea/modifica una skill |
| componente visual | lint del área + smoke en claro/oscuro y responsive |
| formulario | schema, blur, teclado, errores, submit éxito/fallo |
| service/entidad | typecheck, lint, tests relevantes, status/shapes y error de red |
| ruta/layout | lint, build y navegación directa/refresh |
| auth/cookies | typecheck, lint, build y matriz de sesión |
| odontograma | entrada pública, carga, autosave, histórico y fallo de carga |

Si una compuerta falla por deuda preexistente, registrar el comando, separar
errores de archivos tocados y demostrar que el cambio no aumenta el baseline.
No ocultar una regresión como “deuda existente”.

## Matriz manual por feature

- loading inicial y recarga;
- datos, vacío y error;
- creación/edición/cancelación si aplica;
- permisos permitido y denegado;
- sesión expirada;
- red lenta o sin conexión;
- viewport móvil y escritorio;
- tema claro y oscuro;
- navegación por teclado y foco;
- copy y mensajes en español.

## Estrategia futura recomendada

Ampliaciones futuras según necesidad de la tarea:

1. unitarias para `lib/query`, validaciones, permisos y dominio puro;
2. integración para services, hooks y adapters con respuestas simuladas;
3. componentes para formularios y estados de permisos;
4. E2E para OTP/JWT, agenda, paciente, odontograma y logout;
5. CI con typecheck, lint, tests y build.

El runner unitario/de componentes existente es Vitest. No agregar otra herramienta como efecto lateral de una feature; una futura solución E2E/CI requiere definir mantenimiento, fixtures y tiempo de ejecución.

## Definition of Done

- comportamiento y alcance acordados;
- fronteras y contratos preservados;
- estados de UI cubiertos;
- permisos y privacidad revisados;
- validaciones ejecutadas y reportadas;
- sin nuevos errores en archivos tocados;
- documentación actualizada cuando cambia una regla;
- cambios agrupables en commits atómicos.
