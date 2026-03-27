# Odontograma: Backlog De Implementacion Ordenado Por Dependencia Y Riesgo

## Objetivo

Traducir el análisis funcional y la propuesta de contrato v2 en tickets técnicos ejecutables, priorizados por dependencia, riesgo y compatibilidad.

## Orden recomendado

| Ticket | Prioridad | Riesgo | Depende de             | Resultado                                                                     |
| ------ | --------- | ------ | ---------------------- | ----------------------------------------------------------------------------- |
| OD-001 | P0        | Medio  | Ninguno                | Matriz funcional cerrada y trazable a preguntas Q1-Q40.                       |
| OD-002 | P0        | Alto   | OD-001                 | Contrato v2 del snapshot aprobado con estrategia de migración v1.             |
| OD-003 | P0        | Alto   | OD-002                 | Store, adapter y normalización listos para diagnóstico estructurado de pieza. |
| OD-004 | P0        | Alto   | OD-002                 | Identidad de superficies y zonas extendible sin romper render actual.         |
| OD-005 | P1        | Alto   | OD-003, OD-004         | Guardado y recarga real de diagnóstico clínico completo.                      |
| OD-006 | P1        | Alto   | OD-005                 | Motor de validación e invariantes clínicas bloqueantes.                       |
| OD-007 | P1        | Alto   | OD-005                 | Motor de prioridad visual y automatización desacoplado de heurísticas legacy. |
| OD-008 | P2        | Medio  | OD-005, OD-006         | Flujo modal y footer alineados al flujo clínico final.                        |
| OD-009 | P2        | Medio  | OD-005, OD-006, OD-007 | Plan sugerido, plan persistido y realizado separados con mínimos claros.      |
| OD-010 | P2        | Medio  | OD-003, OD-005         | Estrategia de coexistencia entre estado actual e historial.                   |
| OD-011 | P3        | Medio  | OD-006, OD-010         | Variantes por edad, riesgo o dentición temporal encapsuladas.                 |
| OD-012 | P3        | Bajo   | OD-003 a OD-010        | Smoke tests manuales, fixtures y documentación final de operación.            |

## Tickets detallados

### OD-001 - Congelar matriz funcional

Objetivo:
Cerrar la matriz técnica y dejar cada pregunta Q1-Q40 trazada a una decisión implementable o a un bloqueo formal.

Tareas:

1. Consolidar respuestas ya dadas por el especialista.
2. Marcar bloqueadores pendientes como no implementables por ahora.
3. Vincular cada decisión a impacto sobre tipos, store, UI y visualización.

Entregables:

1. Matriz técnica final.
2. Lista única de bloqueadores.

Riesgo principal:
Implementar reglas clínicas inferidas y luego rehacer contratos.

### OD-002 - Aprobar contrato v2 y migración

Objetivo:
Definir el shape final del snapshot v2 y del ClinicalEvent enriquecido sin romper snapshots v1.

Tareas:

1. Añadir schemaVersion al state serializado.
2. Definir diagnosisRecord, diagnosisPayload, visualState y SurfaceRef.
3. Especificar fallback de v1 a v2.

Archivos probables:

1. lib/odontogram/store.tsx
2. lib/odontogram/adapters/api.ts
3. lib/odontogram/domain/odontogram/types/\*
4. docs/ODONTOGRAM_API.md

Riesgo principal:
Romper la lectura de snapshots existentes o perder campos en guardados sucesivos.

### OD-003 - Refactor de estado clínico estructurado

Objetivo:
Hacer que el store y el adapter entiendan diagnóstico de pieza y evidencia sin parsing por notes.

Tareas:

1. Extender Tooth y ClinicalEvent con campos v2.
2. Crear mapper de normalización v1 a v2.
3. Eliminar dependencia de window globals para diagnóstico y pulpa.

Archivos probables:

1. lib/odontogram/store.tsx
2. lib/odontogram/adapters/api.ts
3. components/features/odontogram/tooth-modal.tsx
4. components/features/odontogram/diagnosis-tab.tsx

Riesgo principal:
Generar divergencia entre estado en memoria, evento persistido y lo mostrado por el modal.

### OD-004 - Modelo de superficies y zonas

Objetivo:
Preparar el módulo para incisal, cervical y radicular sin romper los cinco segmentos actuales.

Tareas:

1. Introducir SurfaceRef o SurfaceZoneCode.
2. Mantener compatibilidad con ToothSurface clásico.
3. Ajustar selector y SVG para anteriores y zonas nuevas según cierre clínico.

Archivos probables:

1. lib/odontogram/domain/odontogram/types/surface.types.ts
2. components/features/odontogram/surface-selector.tsx
3. components/features/odontogram/tooth-svg-multi-view.tsx
4. components/features/odontogram/surfaces-tab.tsx

Riesgo principal:
Duplicar semánticas de superficie y crear snapshots inconsistentes.

### OD-005 - Persistencia de diagnóstico completo

Objetivo:
Guardar y recargar diagnósticos de superficie y de pieza con ICDAS 0 permitido cuando aplique.

Tareas:

1. Persistir lesiones no cariosas sin caries.
2. Persistir pulpalStatus, periapicalStatus, vitalityTests, painScore, generalNotes y evidenceRefs.
3. Rehidratar el modal desde datos estructurados, no desde notes o estados locales perdibles.

Archivos probables:

1. components/features/odontogram/diagnosis-tab.tsx
2. components/features/odontogram/tooth-modal.tsx
3. lib/odontogram/store.tsx
4. lib/odontogram/domain/odontogram/types/tooth.types.ts
5. lib/odontogram/domain/odontogram/types/clinical-event.types.ts

Riesgo principal:
Persistir datos clínicos que luego no alimenten correctamente el historial ni el estado actual.

### OD-006 - Validación e invariantes clínicas

Objetivo:
Bloquear guardados inválidos y modelar completitud de diagnóstico, plan y realizado.

Tareas:

1. Declarar reglas para ICDAS 3-6 y 5-6.
2. Declarar combinaciones inválidas y restricciones por ausente o implante.
3. Implementar estado draft versus complete para diagnóstico y plan.

Archivos probables:

1. components/features/odontogram/diagnosis-tab.tsx
2. components/features/odontogram/tooth-modal.tsx
3. components/features/odontogram/plan-tab.tsx
4. components/features/odontogram/performed-tab.tsx

Riesgo principal:
Bloquear en exceso o, peor, permitir estados clínicamente incoherentes que entren al snapshot.

### OD-007 - Prioridad visual y automatización

Objetivo:
Sacar la lógica clínica dura de OdontogramColorService y ToothSymbolService y reemplazarla por reglas declarativas.

Tareas:

1. Crear tabla de priorityKey y symbolKey.
2. Soportar visualImpact none para diagnósticos de soporte.
3. Encapsular sugerencias de plan, urgencia y cambios automáticos de estado global.

Archivos probables:

1. lib/odontogram/domain/odontogram/services/OdontogramColorService.ts
2. lib/odontogram/domain/odontogram/services/ToothSymbolService.ts
3. lib/odontogram/store.tsx
4. components/features/odontogram/odontogram-grid.tsx

Riesgo principal:
Alterar el render compartido del módulo con reglas parciales o difíciles de explicar al usuario clínico.

### OD-008 - Flujo modal y navegación clínica

Objetivo:
Eliminar el footer heredado y alinear el modal al flujo clínico final.

Tareas:

1. Retirar Aplicar y seguir.
2. Definir acción primaria de guardado y comportamiento posterior.
3. Alinear transición entre diagnóstico, plan y realizado.

Archivos probables:

1. components/features/odontogram/tooth-modal.tsx
2. components/features/odontogram/odontogram-module.tsx
3. lib/odontogram/application/hooks/useOdontogramModule.ts

Riesgo principal:
Cambiar navegación sin cerrar antes las reglas de completitud.

### OD-009 - Ciclo de vida plan y realizado

Objetivo:
Diferenciar sugerencia, plan persistido y procedimiento realizado con mínimos clínicos claros.

Tareas:

1. Separar suggestion from persisted plan.
2. Impedir done sin datos mínimos de ejecución.
3. Asegurar que el render visual y los símbolos respondan al estado real.

Archivos probables:

1. components/features/odontogram/plan-tab.tsx
2. components/features/odontogram/performed-tab.tsx
3. lib/odontogram/domain/odontogram/types/procedure.types.ts

Riesgo principal:
Seguir colapsando plan y realizado en un solo evento ambiguo.

### OD-010 - Estado actual versus historial

Objetivo:
Definir cómo conviven el estado actual del diente y la traza histórica por visitas.

Tareas:

1. Decidir si Tooth.diagnosisRecord representa solo estado vigente.
2. Mantener clinicalEvents como bitácora append-only.
3. Asegurar que la recarga del snapshot no destruya evidencia histórica.

Archivos probables:

1. lib/odontogram/store.tsx
2. lib/odontogram/adapters/api.ts
3. components/features/odontogram/odontogram-module.tsx
4. components/features/odontogram/tooth-modal.tsx

Riesgo principal:
Confundir estado actual con eventos históricos y terminar pintando datos obsoletos.

### OD-011 - Variantes clínicas futuras

Objetivo:
Encapsular reglas por riesgo, edad o dentición temporal sin contaminar el contrato base.

Tareas:

1. Revisar modificadores por patientRisk.
2. Definir feature flags o policy objects por contexto clínico.
3. Mantener el contrato base neutral mientras no se cierre Q39.

Riesgo principal:
Sobrediseñar antes de tener respuesta clínica confirmada.

### OD-012 - Validación manual y documentación

Objetivo:
Cerrar la implementación con evidencia de compatibilidad y guía operativa.

Tareas:

1. Preparar fixtures v1 y v2.
2. Ejecutar smoke tests manuales sobre carga, guardado, historia y render.
3. Actualizar documentación técnica del odontograma.

Riesgo principal:
Introducir una migración invisible que solo falle con snapshots reales viejos.

## Dependencias críticas

1. No arrancar OD-005 sin OD-002 y OD-003 cerrados.
2. No tocar reglas visuales definitivas de OD-007 sin cerrar Q7 y Q35 o sin un fallback declarativo claro.
3. No cerrar flujo de OD-008 ni lifecycle de OD-009 mientras sigan abiertas Q30, Q31 y Q38.

## Recomendación de ejecución por iteraciones

### Iteración 1

1. OD-001
2. OD-002
3. OD-003

### Iteración 2

1. OD-004
2. OD-005
3. OD-006

### Iteración 3

1. OD-007
2. OD-008
3. OD-009

### Iteración 4

1. OD-010
2. OD-011
3. OD-012
