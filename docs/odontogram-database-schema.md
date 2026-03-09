# Odontograma — Modelo de Base de Datos

## 1. Objeto que envía el Front (snapshot completo)

El frontend **no envía requests HTTP individuales** por evento. Acumula todo en el store Zustand en memoria y serializa el snapshot completo vía el adapter:

```jsonc
{
  "metadata": {
    "version": 1,
    "patientId": "14760845-ee28-4496-9a56-2ecc81b15af2",
    "clinicId": "clinic-001",
    "authorId": "doctor-uuid",
    "visitId": "visit-uuid",
    "updatedAt": "2026-03-09T19:19:48.105Z",
  },
  "teeth": [
    {
      "number": 17,
      "globalStatus": "endodontic",
      "treatments": [],
      "surfaceTreatments": [],
      "surfaceConditions": [],
      "history": [],
    },
    // ... 32 dientes
  ],
  "clinicalEvents": [
    {
      "id": "8ef3f743-01d9-43d6-aa64-fbc9c13d788f",
      "toothNumber": 17,
      "surfaces": [],
      "level": "tooth",
      "type": "diagnosis",
      "status": "observation",
      "notes": "Estado global: endodontic",
      "createdAt": "2026-03-09T19:14:36.586Z",
      "updatedAt": "2026-03-09T19:14:36.586Z",
    },
    {
      "id": "77f9c5e6-e69c-4a02-91f9-117bfb97d8c3",
      "toothNumber": 17,
      "surfaces": ["oclusal"],
      "level": "surface",
      "type": "diagnosis",
      "status": "open",
      "severity": 6,
      "icdasScore": 6,
      "notes": "ICDAS 6",
      "createdAt": "2026-03-09T19:14:36.586Z",
      "updatedAt": "2026-03-09T19:19:48.104Z",
    },
    {
      "id": "0aaf2b95-1669-47f6-9424-b6a635322ff0",
      "toothNumber": 17,
      "surfaces": ["mesial"],
      "level": "surface",
      "type": "diagnosis",
      "status": "open",
      "severity": 0,
      "icdasScore": 0,
      "notes": "ICDAS 0",
      "createdAt": "2026-03-09T19:14:36.587Z",
      "updatedAt": "2026-03-09T19:19:48.105Z",
    },
    {
      "id": "8bfe281d-4c9d-4131-9d68-6d716b22d07f",
      "toothNumber": 17,
      "surfaces": ["distal"],
      "level": "surface",
      "type": "diagnosis",
      "status": "open",
      "severity": 2,
      "icdasScore": 2,
      "notes": "ICDAS 2",
      "createdAt": "2026-03-09T19:14:36.587Z",
      "updatedAt": "2026-03-09T19:19:48.105Z",
    },
    {
      "id": "a6054169-df6d-46b6-8d85-2f5e83ba9e08",
      "toothNumber": 17,
      "surfaces": ["lingual"],
      "level": "surface",
      "type": "diagnosis",
      "status": "open",
      "severity": 6,
      "icdasScore": 6,
      "notes": "ICDAS 6",
      "createdAt": "2026-03-09T19:14:36.587Z",
      "updatedAt": "2026-03-09T19:19:48.105Z",
    },
  ],
  "treatmentPlans": [],
}
```

---

## 2. Esquema de Base de Datos Normalizado (PostgreSQL)

### 2.1 Diagrama de relaciones

```
patients ──1:N──> odontogram_snapshots ──1:N──> clinical_events
                       │                              │
                       └──1:N──> teeth_status     clinical_event_surfaces
                                                      │
                                                 (surface ENUM)

clinical_events ──1:N──> clinical_event_materials
treatment_plans ──M:N──> clinical_events (via treatment_plan_events)
```

### 2.2 Tablas

#### `odontogram_snapshots`

Versión/foto del odontograma de un paciente. Cada guardado crea o actualiza un snapshot.

```sql
CREATE TABLE odontogram_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id),
  clinic_id     UUID REFERENCES clinics(id),
  author_id     UUID REFERENCES doctors(id),
  visit_id      UUID REFERENCES appointments(id),
  version       SMALLINT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (patient_id, clinic_id)  -- un snapshot activo por paciente/clínica
);

CREATE INDEX idx_snapshots_patient ON odontogram_snapshots(patient_id);
```

#### `teeth_status`

Estado global de cada diente en un snapshot. 32 filas por paciente.

```sql
CREATE TYPE tooth_global_status AS ENUM (
  'healthy', 'absent', 'implant', 'endodontic', 'crown'
);

CREATE TABLE teeth_status (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id   UUID NOT NULL REFERENCES odontogram_snapshots(id) ON DELETE CASCADE,
  tooth_number  SMALLINT NOT NULL CHECK (tooth_number BETWEEN 11 AND 48),
  global_status tooth_global_status NOT NULL DEFAULT 'healthy',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (snapshot_id, tooth_number)
);

CREATE INDEX idx_teeth_snapshot ON teeth_status(snapshot_id);
```

#### `clinical_events`

Tabla central. Cada registro = un evento clínico (diagnóstico, plan, procedimiento realizado, endo, etc.)

```sql
CREATE TYPE clinical_event_type AS ENUM (
  'diagnosis', 'plan', 'performed', 'perio',
  'prosthesis', 'endo', 'implante', 'ausente'
);

CREATE TYPE clinical_event_status AS ENUM (
  'open', 'plan', 'in_progress', 'done', 'canceled', 'observation'
);

CREATE TYPE event_level AS ENUM ('tooth', 'surface');

CREATE TYPE procedure_priority AS ENUM ('alta', 'media', 'baja');

CREATE TYPE procedure_category AS ENUM (
  'restaurador', 'endodoncia', 'protesis', 'implante',
  'preventivo', 'periodoncia', 'estetico', 'cirugia'
);

CREATE TABLE clinical_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id     UUID NOT NULL REFERENCES odontogram_snapshots(id) ON DELETE CASCADE,
  visit_id        UUID REFERENCES appointments(id),
  tooth_number    SMALLINT NOT NULL CHECK (tooth_number BETWEEN 11 AND 48),
  level           event_level NOT NULL DEFAULT 'surface',
  type            clinical_event_type NOT NULL,
  status          clinical_event_status NOT NULL DEFAULT 'open',

  -- Diagnóstico ICDAS
  severity        SMALLINT CHECK (severity BETWEEN 0 AND 6),
  icdas_score     SMALLINT CHECK (icdas_score BETWEEN 0 AND 6),

  -- Procedimiento
  procedure_id    VARCHAR(100),
  procedure_name  VARCHAR(255),
  category        procedure_category,
  priority        procedure_priority DEFAULT 'media',
  material        VARCHAR(255),
  duration_min    SMALLINT,
  cost            DECIMAL(10,2),

  -- Metadata
  notes           TEXT,
  author_id       UUID REFERENCES doctors(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_snapshot ON clinical_events(snapshot_id);
CREATE INDEX idx_events_tooth ON clinical_events(snapshot_id, tooth_number);
CREATE INDEX idx_events_type ON clinical_events(type);
CREATE INDEX idx_events_status ON clinical_events(status);
```

#### `clinical_event_surfaces`

Tabla pivote: un evento puede afectar múltiples superficies (ej. restauración MOD).

```sql
CREATE TYPE tooth_surface AS ENUM (
  'mesial', 'distal', 'facial', 'lingual', 'oclusal'
);

CREATE TABLE clinical_event_surfaces (
  event_id    UUID NOT NULL REFERENCES clinical_events(id) ON DELETE CASCADE,
  surface     tooth_surface NOT NULL,

  PRIMARY KEY (event_id, surface)
);

CREATE INDEX idx_event_surfaces_event ON clinical_event_surfaces(event_id);
```

#### `treatment_plans`

Planes de tratamiento agrupados.

```sql
CREATE TYPE plan_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE treatment_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id   UUID NOT NULL REFERENCES odontogram_snapshots(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  status        plan_status NOT NULL DEFAULT 'active',
  total_price   DECIMAL(10,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `treatment_plan_events`

Relación M:N entre planes y eventos clínicos (procedimientos asignados al plan).

```sql
CREATE TABLE treatment_plan_events (
  plan_id     UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES clinical_events(id) ON DELETE CASCADE,
  sort_order  SMALLINT NOT NULL DEFAULT 0,

  PRIMARY KEY (plan_id, event_id)
);
```

#### `clinical_event_attachments`

Archivos adjuntos (radiografías, fotos).

```sql
CREATE TABLE clinical_event_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES clinical_events(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_type   VARCHAR(50),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Mapeo Front → DB

| Campo del Front (`ClinicalEvent`) | Columna DB (`clinical_events`)    |
| --------------------------------- | --------------------------------- |
| `id`                              | `id` (UUID)                       |
| `toothNumber`                     | `tooth_number`                    |
| `surfaces[]`                      | → `clinical_event_surfaces` (1:N) |
| `level`                           | `level`                           |
| `type`                            | `type`                            |
| `status`                          | `status`                          |
| `severity`                        | `severity`                        |
| `icdasScore`                      | `icdas_score`                     |
| `procedureId`                     | `procedure_id`                    |
| `procedureName`                   | `procedure_name`                  |
| `category`                        | `category`                        |
| `priority`                        | `priority`                        |
| `material`                        | `material`                        |
| `durationMin`                     | `duration_min`                    |
| `cost`                            | `cost`                            |
| `notes`                           | `notes`                           |
| `attachments[]`                   | → `clinical_event_attachments`    |
| `visitId`                         | `visit_id`                        |
| `authorId`                        | `author_id`                       |
| `createdAt`                       | `created_at`                      |
| `updatedAt`                       | `updated_at`                      |

---

## 4. Ejemplo de INSERT para el diente 17 (del log)

```sql
-- 1. Snapshot (upsert)
INSERT INTO odontogram_snapshots (id, patient_id, author_id, visit_id, version)
VALUES ('snap-uuid', '14760845-ee28-4496-9a56-2ecc81b15af2', 'doctor-uuid', 'visit-uuid', 1)
ON CONFLICT (patient_id, clinic_id) DO UPDATE SET updated_at = now();

-- 2. Estado global del diente
INSERT INTO teeth_status (snapshot_id, tooth_number, global_status)
VALUES ('snap-uuid', 17, 'endodontic')
ON CONFLICT (snapshot_id, tooth_number) DO UPDATE SET
  global_status = EXCLUDED.global_status,
  updated_at = now();

-- 3. Evento: diagnóstico a nivel diente (estado global)
INSERT INTO clinical_events (id, snapshot_id, tooth_number, level, type, status, notes)
VALUES (
  '8ef3f743-01d9-43d6-aa64-fbc9c13d788f',
  'snap-uuid', 17, 'tooth', 'diagnosis', 'observation',
  'Estado global: endodontic'
);
-- (sin superficies → no se inserta en clinical_event_surfaces)

-- 4. Evento: diagnóstico oclusal ICDAS 6
INSERT INTO clinical_events (id, snapshot_id, tooth_number, level, type, status, severity, icdas_score, notes)
VALUES (
  '77f9c5e6-e69c-4a02-91f9-117bfb97d8c3',
  'snap-uuid', 17, 'surface', 'diagnosis', 'open', 6, 6,
  'ICDAS 6'
);

INSERT INTO clinical_event_surfaces (event_id, surface)
VALUES ('77f9c5e6-e69c-4a02-91f9-117bfb97d8c3', 'oclusal');

-- 5. Evento: diagnóstico mesial ICDAS 0 (sano)
INSERT INTO clinical_events (id, snapshot_id, tooth_number, level, type, status, severity, icdas_score, notes)
VALUES (
  '0aaf2b95-1669-47f6-9424-b6a635322ff0',
  'snap-uuid', 17, 'surface', 'diagnosis', 'open', 0, 0,
  'ICDAS 0'
);

INSERT INTO clinical_event_surfaces (event_id, surface)
VALUES ('0aaf2b95-1669-47f6-9424-b6a635322ff0', 'mesial');

-- 6. Evento: diagnóstico distal ICDAS 2
INSERT INTO clinical_events (id, snapshot_id, tooth_number, level, type, status, severity, icdas_score, notes)
VALUES (
  '8bfe281d-4c9d-4131-9d68-6d716b22d07f',
  'snap-uuid', 17, 'surface', 'diagnosis', 'open', 2, 2,
  'ICDAS 2'
);

INSERT INTO clinical_event_surfaces (event_id, surface)
VALUES ('8bfe281d-4c9d-4131-9d68-6d716b22d07f', 'distal');

-- 7. Evento: diagnóstico lingual ICDAS 6
INSERT INTO clinical_events (id, snapshot_id, tooth_number, level, type, status, severity, icdas_score, notes)
VALUES (
  'a6054169-df6d-46b6-8d85-2f5e83ba9e08',
  'snap-uuid', 17, 'surface', 'diagnosis', 'open', 6, 6,
  'ICDAS 6'
);

INSERT INTO clinical_event_surfaces (event_id, surface)
VALUES ('a6054169-df6d-46b6-8d85-2f5e83ba9e08', 'lingual');
```

---

## 5. Queries útiles

### Obtener estado actual del diente 17

```sql
SELECT ts.tooth_number, ts.global_status,
       ce.id AS event_id, ce.type, ce.status, ce.icdas_score,
       ces.surface
FROM teeth_status ts
JOIN odontogram_snapshots os ON os.id = ts.snapshot_id
LEFT JOIN clinical_events ce ON ce.snapshot_id = os.id AND ce.tooth_number = ts.tooth_number
LEFT JOIN clinical_event_surfaces ces ON ces.event_id = ce.id
WHERE os.patient_id = '14760845-ee28-4496-9a56-2ecc81b15af2'
  AND ts.tooth_number = 17
ORDER BY ce.type, ces.surface;
```

### Listar todos los dientes con patología (ICDAS ≥ 3)

```sql
SELECT ce.tooth_number, ces.surface, ce.icdas_score
FROM clinical_events ce
JOIN clinical_event_surfaces ces ON ces.event_id = ce.id
JOIN odontogram_snapshots os ON os.id = ce.snapshot_id
WHERE os.patient_id = '14760845-ee28-4496-9a56-2ecc81b15af2'
  AND ce.type = 'diagnosis'
  AND ce.status = 'open'
  AND ce.icdas_score >= 3
ORDER BY ce.tooth_number, ces.surface;
```

### Resumen de plan de tratamiento

```sql
SELECT tp.name AS plan_name,
       ce.tooth_number, ce.procedure_name, ce.status,
       ce.cost, ces.surface
FROM treatment_plans tp
JOIN treatment_plan_events tpe ON tpe.plan_id = tp.id
JOIN clinical_events ce ON ce.id = tpe.event_id
LEFT JOIN clinical_event_surfaces ces ON ces.event_id = ce.id
WHERE tp.snapshot_id = 'snap-uuid'
ORDER BY tpe.sort_order;
```

---

## 6. Estrategia de persistencia (API)

### Endpoint sugerido

```
PUT /api/patients/{patientId}/odontogram
```

### Payload

El mismo snapshot JSON de la sección 1. El backend:

1. **Upsert** `odontogram_snapshots`
2. **Upsert** cada diente en `teeth_status`
3. **Diff** `clinical_events`: comparar IDs entrantes vs existentes
   - IDs nuevos → `INSERT`
   - IDs existentes con `updatedAt` diferente → `UPDATE`
   - IDs ausentes en el payload → `soft DELETE` o marcar `canceled`
4. **Sync** `clinical_event_surfaces` por cada evento
5. **Sync** `treatment_plans` y `treatment_plan_events`

### Respuesta

```jsonc
{
  "snapshotId": "uuid",
  "updatedAt": "2026-03-09T19:19:48.105Z",
  "eventsCreated": 5,
  "eventsUpdated": 0,
  "eventsDeleted": 0,
}
```

---

## 7. Notas de Normalización

| Decisión                             | Justificación                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `surfaces` como tabla pivote         | Un evento puede tener 0–5 superficies. Evita arrays y habilita filtros SQL.                  |
| `clinical_events` unificada          | Un solo tipo de registro para diagnóstico, plan y realizado simplifica auditoría y timeline. |
| `icdas_score` separado de `severity` | `severity` puede representar urgencia general; `icdas_score` es específico de caries.        |
| `teeth_status` separada              | Permite consultar estado global sin parsear eventos.                                         |
| ENUMs de PostgreSQL                  | Validación a nivel DB, mejor rendimiento en índices que VARCHAR.                             |
| Snapshot por paciente                | Un solo punto de verdad; el front envía el estado completo.                                  |

---

## 8. Explicación narrativa del modelo

Todo parte de un **paciente** (`patients`). Cada paciente tiene exactamente un **snapshot de odontograma** (`odontogram_snapshots`), que es la "fotografía" actual de toda su boca — quién lo creó, en qué clínica, en qué visita y cuándo se actualizó por última vez.

Dentro de ese snapshot viven **32 registros de dientes** (`teeth_status`), uno por cada pieza dental (numeradas del 11 al 48 según la nomenclatura FDI). Cada fila solo guarda el **estado global** del diente: si está sano, ausente, tiene corona, endodoncia o implante. Es una tabla desnormalizada a propósito para poder consultar rápidamente "¿qué dientes le faltan a este paciente?" sin tener que agregar eventos.

Lo interesante sucede en **`clinical_events`**, la tabla central del sistema. Cada fila es un **evento clínico** que le ocurrió a un diente: un diagnóstico de caries (con su puntuación ICDAS de 0 a 6), un procedimiento planificado (resina, corona, extracción…), un procedimiento ya realizado, un hallazgo endodóntico, etc. Todos comparten la misma estructura porque al final son "cosas que le pasaron a un diente en una fecha". El campo `type` distingue si es diagnóstico, plan o realizado; el campo `status` indica si está abierto, planificado, en progreso, completado o cancelado.

Un evento puede afectar **una o varias superficies** del diente (mesial, distal, facial, lingual, oclusal), o puede ser a nivel de diente completo (como una endodoncia). Por eso las superficies no están en la misma tabla, sino en una **tabla pivote** (`clinical_event_surfaces`): si un evento de "restauración MOD" toca mesial, oclusal y distal, se crean 3 filas en esta tabla pivote, todas apuntando al mismo evento. Esto permite hacer queries como "¿qué superficies del diente 17 tienen caries?" de forma eficiente.

Los **planes de tratamiento** (`treatment_plans`) agrupan varios eventos clínicos de tipo "plan" bajo un nombre (por ejemplo "Plan restaurador cuadrante superior"). La relación es muchos-a-muchos a través de `treatment_plan_events`: un plan puede incluir múltiples procedimientos, y en teoría un procedimiento podría pertenecer a más de un plan.

Finalmente, los **archivos adjuntos** (`clinical_event_attachments`) como radiografías o fotos intraorales se vinculan a un evento clínico específico, permitiendo trazar exactamente qué imagen corresponde a qué diagnóstico o procedimiento.

**En resumen**: `patients` → `odontogram_snapshots` → `teeth_status` (32 dientes) + `clinical_events` (N eventos por diente) → `clinical_event_surfaces` (superficies por evento). Los planes agrupan eventos y los adjuntos se cuelgan de eventos individuales. Todo fluye desde el paciente hacia abajo, y el frontend envía el snapshot completo en un solo PUT que el backend descompone en estas tablas.
