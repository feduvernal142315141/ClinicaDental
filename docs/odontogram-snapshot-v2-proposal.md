# Odontograma: Propuesta De Contrato V2 Compatible Hacia Atras

## Objetivo

Diseñar un contrato v2 del snapshot y de ClinicalEvent que soporte respuestas clínicas más ricas sin romper el backend actual ni destruir snapshots previos.

## Restricciones reales del repo

1. El backend guarda state como JSONB sin validación estructural fuerte.
2. El adapter actual carga y guarda principalmente teeth y clinicalEvents.
3. El store y el render ya dependen intensamente de ClinicalEvent y ToothSurface.
4. El mayor riesgo de compatibilidad está en identidad de superficies y en reglas visuales embebidas.

## Principios de diseño

1. Mantener compatibilidad de transporte con el backend actual: el payload sigue siendo un state serializado como JSON.
2. Mantener compatibilidad de lectura con snapshots v1: si falta schemaVersion, asumir versión 1 y migrar en memoria.
3. Evitar romper filtros actuales por tipo de evento: diagnosis, plan y performed siguen existiendo.
4. Mover la riqueza clínica a payloads estructurados, no a notes parseadas.
5. Separar persistencia clínica de impacto visual: un hallazgo puede guardarse aunque no pinte el odontograma.
6. Preparar identidad de superficie extensible sin forzar migración inmediata de todos los snapshots históricos.

## Estrategia de compatibilidad

### V1 actual

El state serializado hoy tiene esta forma práctica:

```json
{
  "teeth": [...],
  "clinicalEvents": [...]
}
```

### V2 propuesta

El state pasa a incluir schemaVersion y conserva teeth y clinicalEvents como columnas vertebrales:

```json
{
  "schemaVersion": 2,
  "teeth": [...],
  "clinicalEvents": [...]
}
```

### Regla de migración

1. Si schemaVersion no existe, asumir 1.
2. En carga, mapear eventos legacy a payloads v2 en memoria cuando sea posible.
3. En guardado, emitir siempre schemaVersion 2.
4. Mantener fields legacy mientras el motor visual y el UI todavía dependan de ellos.

## Propuesta de tipos v2

### Superficies y zonas

```ts
export type LegacyToothSurface =
  | "mesial"
  | "distal"
  | "facial"
  | "lingual"
  | "oclusal";

export type SurfaceZoneCode =
  | "mesial"
  | "distal"
  | "facial"
  | "lingual"
  | "oclusal"
  | "incisal"
  | "cervical"
  | "radicular";

export interface SurfaceRef {
  code: SurfaceZoneCode;
  region?: "crown" | "root";
  legacyCode?: LegacyToothSurface;
  displayLabel?: string;
}
```

### Hallazgos por superficie

```ts
export type DiagnosisFindingKind =
  | "caries"
  | "non-carious-lesion"
  | "fracture"
  | "support-only";

export interface SurfaceDiagnosisFinding {
  id: string;
  kind: DiagnosisFindingKind;
  surfaces: SurfaceRef[];
  icdasScore?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  cariesType?: "coronal" | "radicular";
  cariesActivity?: "activa" | "inactiva" | "no-aplica";
  nonCariousLesions?: Array<
    "atricion" | "abrasion" | "erosion" | "hipoplasia" | "fisura" | "fractura"
  >;
  notes?: string;
  visualImpact: "surface" | "tooth" | "none";
  requiredEvidence?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Diagnóstico de pieza

```ts
export interface VitalityTestRecord {
  type: "frio" | "calor" | "ept" | "percusion" | "palpacion";
  result: "positivo" | "negativo" | "no-realizado";
}

export interface EvidenceRef {
  id: string;
  ownerLevel: "surface" | "tooth" | "visit";
  ownerFindingId?: string;
  assetType: "foto" | "radiografia" | "otro";
  url?: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface ToothDiagnosisRecord {
  toothNumber: number;
  pulpalStatus?:
    | "normal"
    | "reversible"
    | "irreversible"
    | "necrosis"
    | "observacion";
  periapicalStatus?: "normal" | "periodontitis-apical" | "absceso" | "quiste";
  vitalityTests?: VitalityTestRecord[];
  painScore?: number;
  generalNotes?: string;
  evidenceRefs?: EvidenceRef[];
  findings: SurfaceDiagnosisFinding[];
  completionState: "draft" | "complete";
  updatedAt: string;
}
```

### Tooth v2

```ts
export interface ToothV2 extends Tooth {
  diagnosisRecord?: ToothDiagnosisRecord;
}
```

### ClinicalEvent v2

```ts
export interface ClinicalEventV2 extends ClinicalEvent {
  schemaVersion?: 2;
  diagnosisKind?: "surface-finding" | "tooth-diagnostic" | "workflow-note";
  surfacesV2?: SurfaceRef[];
  diagnosisPayload?: {
    findingIds?: string[];
    pulpalStatus?: ToothDiagnosisRecord["pulpalStatus"];
    periapicalStatus?: ToothDiagnosisRecord["periapicalStatus"];
    vitalityTests?: VitalityTestRecord[];
    painScore?: number;
    generalNotes?: string;
    evidenceRefs?: EvidenceRef[];
  };
  visualState?: {
    affectsOdontogram: boolean;
    colorKey?: string;
    symbolKey?: string;
    priorityKey?: string;
  };
  automationHints?: {
    suggestPlan?: boolean;
    autoCreatePlan?: boolean;
    updateGlobalStatusTo?: ToothGlobalStatus;
    urgencyLevel?: "none" | "low" | "medium" | "high" | "emergency";
  };
  legacy?: {
    migratedFromSchemaVersion?: 1;
    originalSurfaces?: LegacyToothSurface[];
  };
}
```

## Qué cambia y qué no cambia

### Se mantiene

1. clinicalEvents sigue siendo la fuente de historial y timeline.
2. diagnosis, plan y performed siguen siendo tipos válidos para no romper filtros existentes.
3. El backend actual puede seguir almacenando state sin cambios de endpoint.

### Cambia

1. Tooth puede guardar diagnosisRecord como estado clínico actual estructurado.
2. ClinicalEvent deja de depender de notes para cargar datos pulpares o periapicales.
3. surfaces puede convivir temporalmente con surfacesV2 durante la transición.
4. Las reglas visuales consumen visualState y priorityKey cuando existan, y solo hacen fallback a heurística legacy cuando no existan.

## Cómo resolver el problema actual del repo

### Diagnóstico sin ICDAS mayor que 0

Ejemplo de evento válido en v2:

```json
{
  "id": "evt-1",
  "schemaVersion": 2,
  "toothNumber": 11,
  "surfaces": ["oclusal"],
  "surfacesV2": [
    {
      "code": "incisal",
      "legacyCode": "oclusal",
      "region": "crown",
      "displayLabel": "Incisal"
    }
  ],
  "level": "surface",
  "type": "diagnosis",
  "status": "open",
  "diagnosisKind": "surface-finding",
  "icdasScore": 0,
  "diagnosisPayload": {
    "findingIds": ["finding-1"]
  },
  "visualState": {
    "affectsOdontogram": false,
    "priorityKey": "support-only"
  },
  "legacy": {
    "migratedFromSchemaVersion": 1,
    "originalSurfaces": ["oclusal"]
  }
}
```

### Diagnóstico pulpar estructurado

```json
{
  "id": "evt-2",
  "schemaVersion": 2,
  "toothNumber": 26,
  "surfaces": [],
  "level": "tooth",
  "type": "diagnosis",
  "status": "open",
  "diagnosisKind": "tooth-diagnostic",
  "diagnosisPayload": {
    "pulpalStatus": "irreversible",
    "periapicalStatus": "periodontitis-apical",
    "vitalityTests": [
      { "type": "frio", "result": "negativo" },
      { "type": "percusion", "result": "positivo" }
    ],
    "painScore": 8,
    "generalNotes": "Dolor espontáneo nocturno"
  },
  "visualState": {
    "affectsOdontogram": true,
    "priorityKey": "endodontic"
  },
  "automationHints": {
    "suggestPlan": true,
    "urgencyLevel": "high"
  }
}
```

## Compatibilidad hacia atrás

### Adaptador de lectura

1. Si event.type es diagnosis y tiene icdasScore, mapearlo a un SurfaceDiagnosisFinding legacy.
2. Si event.type es endo y notes contiene Estado pulpar, migrarlo a diagnosisPayload.pulpalStatus en memoria.
3. Si tooth.diagnosis existe pero no diagnosisRecord, usarla como semilla de v2.

### Adaptador de escritura

1. Guardar schemaVersion en el state.
2. Mantener surfaces legacy mientras haya render o filtros que dependan de ToothSurface clásico.
3. Escribir diagnosisRecord en Tooth y diagnosisPayload en eventos nuevos.

### Motor visual

1. Si visualState existe, usarla.
2. Si no existe, fallback a las heurísticas actuales de OdontogramColorService y ToothSymbolService.
3. Si un evento tiene affectsOdontogram false, no debe colorear ni simbolizar el diente aunque sea clínicamente válido.

## Cambios mínimos necesarios en el repo para soportar v2

1. Extender tipos de dominio en lib/odontogram/domain/odontogram/types.
2. Actualizar normalizeSnapshot y el adapter API para leer y guardar schemaVersion 2.
3. Reemplazar el parsing de notes y los window globals en el modal por un estado estructurado.
4. Introducir un mapper v1 a v2 centralizado para cargar snapshots históricos.
5. Convertir OdontogramColorService y ToothSymbolService a lectura declarativa de visualState y priorityKey.

## Decisiones que v2 deja explícitamente abiertas

1. Si incisal será canónico o alias mientras no se cierre la pregunta 9.
2. Si cervical y radicular serán zonas distintas o variantes de una misma región.
3. Si ciertos diagnósticos de pieza deben crear planes automáticamente o solo sugerirlos.
4. Si periapical y pruebas de vitalidad pintan el odontograma o quedan como soporte clínico.
