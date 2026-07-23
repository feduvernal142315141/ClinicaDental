# Guías de desarrollo

## Propósito

Este directorio es la referencia técnica versionada de `front-clinic`. Sirve
para implementar, revisar y desplegar cambios sin romper sus límites actuales.
La fotografía fue verificada contra el repositorio el 22 de julio de 2026.

## Orden de autoridad

Cuando dos fuentes difieran, aplicar este orden:

1. Código y configuración ejecutable de la rama actual.
2. `AGENTS.md` raíz y el `AGENTS.md` más cercano al archivo modificado.
3. Skills de `.agents/skills/*`.
4. Estas guías técnicas.
5. `README.md`, `CLAUDE.md` y `.github/*` como contexto complementario.

No copiar una regla histórica si contradice la implementación vigente. Si una
decisión cambia una frontera arquitectónica, actualizar el código, el
`AGENTS.md` correspondiente y esta documentación en el mismo cambio.

## Mapa de lectura

| Si vas a… | Leer |
|---|---|
| iniciar cualquier cambio | [Tecnología](technology-stack.md), [Arquitectura](architecture.md), [Flujo](development-workflow.md) |
| crear o extender UI | [Estándares](coding-standards.md), [Calidad](quality-and-testing.md) |
| consumir o cambiar un endpoint | [Contratos API](api-contracts.md), [Datos](data-and-database.md), [Seguridad](security.md) |
| tocar auth, cookies o permisos | [Seguridad](security.md), [Arquitectura](architecture.md) |
| modificar el odontograma | [Arquitectura](architecture.md), `lib/odontogram/AGENTS.md`, `$odontogram-module` |
| preparar una entrega | [Despliegue](deployment.md), [Calidad](quality-and-testing.md) |
| evaluar una refactorización | [Restricciones conocidas](known-constraints.md), [Estándares](coding-standards.md) |

## Hechos estructurales

- Es un frontend Next.js 15 App Router; no contiene la base de datos ni el
  backend Spring Boot.
- La UI es deliberadamente mixta mientras continúa la migración desde Ant
  Design hacia las primitivas Bento/Radix.
- La mayoría de las pantallas son Client Components; los layouts raíz conservan
  límites de servidor.
- No existe runner de pruebas ni pipeline CI versionado actualmente.
- El build ignora errores de TypeScript y ESLint; `typecheck` y `lint` son
  compuertas independientes.

## Skill principal

Usar `$clinic-flow-development` para cambios transversales o cuando sea
necesario seleccionar qué guía y qué skill especializada aplican. Las skills
específicas (`$add-feature`, `$fix-bug`, `$code-review`,
`$odontogram-module`, etc.) siguen siendo preferibles para tareas acotadas.
