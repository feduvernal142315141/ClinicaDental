# Calidad y pruebas

## Estado actual

No hay Jest, Vitest, React Testing Library, Playwright ni Cypress configurados.
Tampoco existen archivos `*.test.*`/`*.spec.*` ni workflows CI. No afirmar
cobertura automática.

## Compuertas disponibles

```bash
yarn typecheck
yarn lint
yarn build
```

- `typecheck`: valida TypeScript estricto sin emitir.
- `lint`: usa la configuración ESLint legacy de Next.
- `build`: valida compilación, rutas y generación, pero ignora errores de TS y
  ESLint por configuración.

Para documentación y skills, validar además enlaces locales, frontmatter y
ausencia de placeholders.

## Validación proporcional

| Cambio | Validación mínima |
|---|---|
| documentación/skill | enlaces, rutas y validator de skill |
| componente visual | lint del área + smoke en claro/oscuro y responsive |
| formulario | schema, blur, teclado, errores, submit éxito/fallo |
| service/entidad | typecheck, lint, status/shapes y error de red |
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

Cuando se autorice agregar tooling:

1. unitarias para `lib/query`, validaciones, permisos y dominio puro;
2. integración para services, hooks y adapters con respuestas simuladas;
3. componentes para formularios y estados de permisos;
4. E2E para OTP/JWT, agenda, paciente, odontograma y logout;
5. CI con typecheck, lint, tests y build.

La selección del runner es una decisión arquitectónica pendiente. No agregar
una herramienta como efecto lateral de una feature sin acordar mantenimiento,
fixtures, cobertura y tiempo de CI.

## Definition of Done

- comportamiento y alcance acordados;
- fronteras y contratos preservados;
- estados de UI cubiertos;
- permisos y privacidad revisados;
- validaciones ejecutadas y reportadas;
- sin nuevos errores en archivos tocados;
- documentación actualizada cuando cambia una regla;
- cambios agrupables en commits atómicos.
