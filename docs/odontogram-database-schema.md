# Odontograma — Modelo de Base de Datos (Híbrido JSONB)

## 1. Objeto que envía el Front (snapshot completo)

El frontend **no envía requests HTTP individuales** por evento. Acumula todo en el store Zustand en memoria y serializa el estado completo vía el adapter. Gracias al uso de `JSONB`, la base de datos almacena este estado de forma estructuralmente idéntica a como lo maneja el cliente, minimizando el costoso mapeo relacional.

```jsonc
{
  "metadata": {
    "version": 2,
    "patientId": "14760845-ee28-4496-9a56-2ecc81b15af2",
    "clinicId": "clinic-001",
    "authorId": "doctor-uuid",
    "visitId": "visit-uuid",
    "updatedAt": "2026-03-09T19:19:48.105Z"
  },
  "teeth": [
    {
      "number": 17,
      "globalStatus": "endodontic",
      "treatments": [],
      "surfaceTreatments": [],
      "surfaceConditions": [],
      "history": []
    }
  ],
  "clinicalEvents": [
    {
      "id": "77f9c5e6-e69c-4a02-91f9-117bfb97d8c3",
      "toothNumber": 17,
      "surfaces": ["oclusal"],
      "level": "surface",
      "type": "diagnosis",
      "status": "open",
      "severity": 6,
      "icdasScore": 6,
      "notes": "ICDAS 6"
    }
  ]
}
```

---

## 2. Esquema de Base de Datos Híbrido (PostgreSQL con JSONB)

En lugar de normalizar cada diente, evento y superficie en decenas de tablas y uniones (`JOINs`), consolidamos todo el ecosistema del odontograma en un campo `JSONB` central. Mantendremos tablas separadas exclusivamente para **el histórico de auditoría (snapshots temporales)** y **entidades con ciclo de vida independiente**, como los planes de tratamiento.

### 2.1 Tablas Principales

#### `patient_odontograms` (Estado Actual / Fotografía viva)
Guarda siempre la **última versión** del odontograma del paciente garantizando lectura instantánea.

```sql
CREATE TABLE patient_odontograms (
  patient_id    UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  version       INT NOT NULL DEFAULT 1,
  state         JSONB NOT NULL, -- Contiene 'teeth' y 'clinicalEvents' tal como vienen del Front
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice GIN opcional para búsquedas de alto rendimiento dentro del JSON (Ej: hallar todos los eventos tipo endodoncia transversalmente)
CREATE INDEX idx_patient_odontograms_state ON patient_odontograms USING GIN (state);
```

#### `odontogram_history` (Histórico Inmutable)
Log o bitácora tipo "Append-Only" (Solo inserción) accionada durante cada visita clínica. Permite auditar viajando en el tiempo ("¿Cuál era el diagnóstico hace 6 meses?").

```sql
CREATE TABLE odontogram_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id      UUID REFERENCES appointments(id),
  author_id     UUID REFERENCES doctors(id),
  clinic_id     UUID REFERENCES clinics(id),
  version       INT NOT NULL,
  state         JSONB NOT NULL, -- Copia exacta e inmutable del momento
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_patient ON odontogram_history(patient_id, created_at DESC);
```

#### `treatment_plans` (Entidad Relacional Separada)
Los planes de tratamiento se consultan, facturan y listan desde módulos independientes al odontograma gráfico, por ende conservan su propia tabla transaccional clásica.

```sql
CREATE TYPE plan_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE treatment_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  status        plan_status NOT NULL DEFAULT 'active',
  total_price   DECIMAL(10,2),

  -- Array JSON nativo con los UUID de eventos que pertenecen a este plan
  -- Apuntan a los "id" que viven dentro del JSON principal del patient_odontograms
  event_ids     JSONB DEFAULT '[]'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treatment_plans_patient ON treatment_plans(patient_id);

-- Índice para encontrar rápidamente a qué plan pertenece un UUID de evento clínico
CREATE INDEX idx_treatment_plans_events ON treatment_plans USING GIN (event_ids);
```

---

## 3. Ejemplo de Flujo de Guardado (Endpoint `PUT`)

El backend simplifica su lógica drásticamente. Al recibir la carga JSON ejecuta esta transacción en seco, olvidándose por completo del pesado diff/sincronización relacional.

```sql
BEGIN;

-- 1. Snapshot: Se deposita en el historial de forma inmutable para auditoría y retrocesos
INSERT INTO odontogram_history (patient_id, visit_id, author_id, clinic_id, version, state)
VALUES (
  '14760845-ee28-4496-9a56-2ecc81b15af2', 'visit-uuid', 'doctor-uuid', 'clinic-001', 2,
  '{"teeth": [...], "clinicalEvents": [...]}'::jsonb
);

-- 2. Current: Se pisotea de forma agresiva la memoria viva del Odontograma del paciente
INSERT INTO patient_odontograms (patient_id, version, state, updated_at)
VALUES ('14760845-ee28-4496-9a56-2ecc81b15af2', 2, '{"teeth": [...], "clinicalEvents": [...]}'::jsonb, now())
ON CONFLICT (patient_id) DO UPDATE SET
  state      = EXCLUDED.state,
  version    = EXCLUDED.version,
  updated_at = now();

COMMIT;
```

*(Si existen nuevos planes de tratamiento en el payload, se procesan como operaciones adicionales de `INSERT`/`UPDATE` sobre `treatment_plans`)*.

---

## 4. Queries útiles con JSONB

PostgreSQL maneja el JSON internamente de tal forma que podemos seguir explotando su contenido sin tener tablas separadas.

### Obtener eventos profundos de caries severa (ICDAS >= 3)
A través de `jsonb_array_elements` se aplana el array para ser barrido por la condición SQL:
```sql
SELECT
  patient_id,
  event->>'toothNumber' as tooth_number,
  event->'surfaces' as surfaces,
  event->>'icdasScore' as icdas_score
FROM patient_odontograms,
     jsonb_array_elements(state->'clinicalEvents') AS event
WHERE patient_id = '14760845-ee28-4496-9a56-2ecc81b15af2'
  AND event->>'type' = 'diagnosis'
  AND (event->>'icdasScore')::int >= 3;
```

### Viajar en el tiempo para la pieza dental 17
Buscando en la tabla log histórica:
```sql
SELECT version, created_at, event->>'status', event->>'notes'
FROM odontogram_history,
     jsonb_array_elements(state->'clinicalEvents') AS event
WHERE patient_id = '14760845-ee28-4496-9a56-2ecc81b15af2'
  AND event->>'toothNumber' = '17'
ORDER BY version ASC;
```

### Relación Planes de Tratamiento vs JSON de Eventos
Cómo averiguar qué procedimientos reales asocia determinado plan:
```sql
SELECT tp.name, event->>'procedureName', event->>'cost'
FROM treatment_plans tp
JOIN patient_odontograms po ON tp.patient_id = po.patient_id,
     jsonb_array_elements(po.state->'clinicalEvents') AS event
WHERE tp.id = 'plan-001'
  -- Revisa si el id del evento en el JSON principal existe dentro de la bolsa de IDS "event_ids" del plan
  AND tp.event_ids @> to_jsonb(event->>'id');
```

---

## 5. Cuadro de Beneficios del Modelo Documental (JSONB)

| Beneficio                  | Implicación Funcional |
| -------------------------- | --------------------- |
| **Cero Diffs en Backend**  | Ya no se requiere iterar "diente por diente, superficie por superficie" en capas de servicio para resolver colisiones y eliminaciones. |
| **Lectura Instántanea**    | `O(1)`. La consulta principal de la UI consta de arrancar un solo objeto para renderizar inmediatamente Zustand.  |
| **Extensibilidad Front-first** | Añadir nuevas banderas (Ej: *sangrado en las encías*, *movilidad*) repercute exclusivamente en el tipado Typescript y se guarda automático sin migraciones pesadas. |
| **Auditoría Clara**        | El historial congela visual y médicamente la visita como objeto en un instante del tiempo. |

---

## 6. Explicación narrativa del modelo

Bajo esta nueva filosofía arquitectónica, se abandona el mapeo clásico de bases de datos altamente granulares por una postura de **"Bóveda Documental" (Document Store)** apoyada en el motor JSONB supercargado de PostgreSQL.

Imagina que el odontograma del paciente ya no es un rompecabezas fragmentado en 80+ tablas cruzadas, sino un **documento único y enorme** (`patient_odontograms`). Cada paciente tiene solo una fila activa aquí, y su columna llamada `state` hospeda exactamente la radiografía entera del código: los `teeth`, las recesiones gingivales y miles de `clinicalEvents`. Cuando el médico modifica una región temporal u oclusal en su Frontend y aprieta "Guardar", la carga de responsabilidad técnica salta del servidor a la UI; el Backend meramente abre una transacción y sobrescribe el antiguo bulto de JSONB por el nuevo, logrando una performance asombrosa en el Put API.

Sin embargo, para garantizar una memoria médico-legal indestructible, antes que suceda esta amnesia del presente, tomamos una copia idéntica del JSON del paciente y se inyecta pasivamente al fondo de la tabla **`odontogram_history`** junto con el Doctor que causó tal mutación histórica. Esto asegura funciones futuras muy buscadas, como la **línea de tiempo visual**, habilitando a los doctores retroceder mágicamente a un modelo visual equivalente a como lucía 1 año atrás.

Finalmente, sabiendo que elementos como facturas y agendas giran independientemente, los **Planes de Tratamiento (`treatment_plans`)** actúan de puente relacional. Siguen viviendo bajo su propia potestad clásica (con nombres, status y presupuestos), pero en lugar de entrelazarse pivoteando al motor principal, conservan un arrastre JSON array (`event_ids`). Ese simple array de UUIDs actúa como puntero al JSON masivo vivo, dándole el nivel de interconexión vital para consultar qué procedimientos encuadra qué plan sin fragmentar la lectura universal.
