# Datos y base de datos

## Alcance real

Este repositorio no contiene ORM, migraciones, DDL ni conexión directa a una
base de datos. La persistencia productiva pertenece a `backend-clinic`.
Por tanto, aquí no se debe:

- inventar tablas o índices;
- agregar credenciales de base de datos;
- ejecutar SQL desde Next.js;
- describir un schema físico como confirmado a partir de DTO del frontend.

Una tarea que cambie tablas, constraints, transacciones o retención debe
realizarse en el repositorio del backend y coordinar después sus contratos
frontend.

## Fuentes de verdad del frontend

| Necesidad | Fuente |
|---|---|
| entidad o DTO | `lib/entity/<dominio>/*` |
| validación de formulario | schemas de dominio + `lib/validation/fields.ts` |
| endpoint y status | `lib/services/<dominio>/*` |
| filtros y orden | `lib/query/*` |
| respuesta común | `lib/models/response.ts` |
| estado del odontograma | `lib/odontogram/store.tsx` |
| permisos | `lib/permissions/*` |

Los tipos TypeScript se borran en runtime. En límites no confiables, usar Zod,
type guards o validación explícita cuando el riesgo lo justifique.

## Identificadores, fechas y estados

- Los identificadores de dominio se transportan habitualmente como `string` y
  muchos son UUID.
- Fechas de contrato: `YYYY-MM-DD`.
- Horas de contrato: `HH:mm`.
- No convertir fechas locales a UTC sin revisar la semántica del dominio.
- Mantener `null`, `undefined` y cadena vacía diferenciados según el DTO.
- Varias eliminaciones son lógicas mediante `active`, archive o cancelación; no
  asumir borrado físico.

## Persistencia del odontograma

El adapter API persiste:

- metadata: paciente, clínica, autor, visita y versión;
- `state`: JSON serializado con `schemaVersion`, dientes y eventos clínicos.

Los planes de tratamiento viven en endpoints propios, no dentro del snapshot.
Todo save requiere una visita UUID válida y el autosave usa debounce. Al cambiar
el shape:

1. incrementar o respetar `schemaVersion`;
2. conservar lectura de snapshots anteriores;
3. definir migración o defaults;
4. verificar histórico y modo read-only;
5. no sobrescribir tras una carga fallida.

## Persistencia en navegador

Actualmente se usan cookies, `localStorage` y `sessionStorage` para sesión
auxiliar, consulta activa, branding/cache y adapter local del odontograma.
Reglas para datos nuevos:

- no persistir información clínica si puede volver a consultarse;
- definir namespace y versión;
- limpiar al cerrar sesión cuando corresponda;
- leer después de montar para evitar hidratación inconsistente;
- establecer expiración o estrategia de invalidación;
- documentar si el valor contiene PII.

## Cambio que afecta datos

Antes de implementar:

1. clasificar si el cambio es solo UI, contrato API o schema de backend;
2. confirmar nulabilidad, unicidad, longitud, timezone y ciclo de vida;
3. diseñar compatibilidad para datos existentes;
4. actualizar backend/migración primero si el contrato no es aditivo;
5. actualizar tipos, service, hook y formulario;
6. probar registros legacy, vacío, límites, duplicados y concurrencia;
7. documentar rollback y orden de despliegue.

Nunca usar validación del frontend como única garantía de integridad.
