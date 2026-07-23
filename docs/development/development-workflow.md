# Flujo de desarrollo

## 1. Descubrir antes de cambiar

1. Leer `AGENTS.md` raíz y el más cercano.
2. Clasificar la tarea: feature, bug, refactor, review, odontograma, auth,
   contrato o despliegue.
3. Invocar la skill más específica.
4. Leer configuración base y archivos vecinos.
5. Revisar `git status` y preservar cambios del usuario.
6. Identificar contrato backend, permisos y estados afectados.

## 2. Seleccionar skill

| Tarea | Skill |
|---|---|
| cambio transversal o selección de guías | `$clinic-flow-development` |
| feature estándar | `$add-feature` o `$front-clinic-feature-flow` |
| bug acotado | `$fix-bug` |
| refactor de componente | `$refactor-component-or-module` |
| refactor de hook/store | `$refactor-hook-or-state-logic` |
| odontograma | `$odontogram-module` |
| revisión | `$code-review` |
| preparar commits | `$atomic-commits` |

Una skill no reemplaza la lectura de las instrucciones del directorio.

## 3. Diseñar el cambio mínimo

- Enumerar archivos y capas afectados.
- Reutilizar el patrón del dominio vecino.
- Definir contratos y compatibilidad antes de UI.
- Separar trabajo de backend/base de datos.
- Identificar riesgos de auth, permisos, PII, fechas y concurrencia.
- Evitar migraciones UI o refactors no requeridos.

Si falta una decisión que cambie el contrato o la arquitectura, detener la
implementación y pedirla. No inventar schema, endpoint ni regla clínica.

## 4. Implementar de adentro hacia afuera

Cuando aplique:

1. entidad/schema;
2. query/service/adapter;
3. hook o estado;
4. feature component;
5. route/page;
6. permisos, feedback y accesibilidad;
7. documentación.

El orden reduce estados intermedios débilmente tipados. En bugfixes pequeños,
modificar solo la frontera propietaria de la causa.

## 5. Verificar

- revisar diff y archivos no relacionados;
- ejecutar validación proporcional de
  [Calidad y pruebas](quality-and-testing.md);
- smoke-testear rutas y estados;
- confirmar que no se filtraron secretos o PII;
- registrar limitaciones reales.

## 6. Entregar

- Resumir el resultado, no una cronología de comandos.
- Listar archivos principales y validación.
- Declarar lo no verificado.
- Usar Conventional Commits mediante `$atomic-commits` cuando se solicite.

El README documenta `develop` como rama de integración y `feature/*` para
trabajo, pero la rama destino debe confirmarse en el flujo real de cada entrega;
el repositorio puede estar actualmente en otra rama.

## Cambios arquitectónicos

Un cambio que altere capas, auth, contrato global, persistencia, UI base o
despliegue debe incluir:

- motivo y alternativas;
- compatibilidad y plan de migración;
- impacto en seguridad/datos;
- rollback;
- actualización de `AGENTS.md`, estas guías y skills afectadas.
