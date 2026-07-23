# Contratos API

## Propiedad del contrato

El backend Spring Boot es la autoridad del contrato wire. El frontend mantiene
su espejo tipado en `lib/entity/*` y la integración en `lib/services/*`.
Cualquier cambio incompatible requiere coordinación y despliegue ordenado con
`backend-clinic`.

## Stack de transporte

1. `apiInstance` usa `NEXT_PUBLIC_API_URL`, timeout de 30 segundos y JSON.
2. El interceptor añade `Authorization: Bearer`.
3. Ante 401 protegido intenta un único refresh compartido mediante
   `/api/auth/refresh`.
4. `baseService` ejecuta GET/POST/PUT/PATCH/DELETE.
5. El service de dominio valida status y desempaqueta datos.
6. El hook o consumidor informa un mensaje contextual.

No llamar al backend con `fetch` desde componentes. Los route handlers de auth
y los casos binarios/multipart existentes son excepciones con frontera
explícita, no patrones para copiar indiscriminadamente.

## Familias de endpoints observadas

| Dominio | Base principal |
|---|---|
| auth | `/auth/*` y same-origin `/api/auth/*` |
| citas | `/appointments` |
| pacientes | `/patients` |
| doctores | `/doctor` |
| historia clínica | `/clinical-history/patients` |
| odontograma | `/odontograms` |
| planes | `/treatment-plans` |
| plantillas clínicas | `/service-templates` |
| servicios | `/services` |
| roles | `/api/v1/roles` |
| permisos | `/permissions` |
| etiquetas | `/labels` |
| configuración | `/clinic/*` |
| dashboard | `/dashboard/summary` |
| adjuntos | `/patients/{id}/attachments` |
| subida de imagen | `/api/v1/cloudinary/upload` |
| voz | `/speech/transcribe` |

Esta tabla es un mapa, no una especificación exhaustiva. La firma real vive en
el service y los tipos del dominio.

## Respuestas y errores

`ResponseEntity<T>` mezcla metadata opcional (`code`, `message`, `details`) con
`T`. Algunos endpoints devuelven UUID, boolean, objeto o contenido paginado
directamente. No asumir un wrapper adicional `data` sin inspeccionar el service
vecino.

`baseService` conserva una compatibilidad importante: captura Axios y devuelve
`err.response`. Un service nuevo debe:

- comprobar ausencia de respuesta;
- aceptar solo los status esperados;
- validar campos críticos si el backend tiene shapes históricos;
- llamar `handleServiceError`;
- exponer al hook un tipo estable o lanzar.

## Paginación y búsquedas

Coexisten contratos históricos:

- dialecto standard: `field__OP__value`;
- servicios: `field__OP__value__AND`;
- roles: `field,op,value`;
- búsqueda nueva: árbol booleano enviado a `POST /resource/search`.

`lib/query/*` es la fuente de verdad del frontend. No normalizar los dialectos
en una feature: esa convergencia exige primero soporte de backend.

Las listas suelen modelar `entities` y `pagination`. Algunos backends devuelven
como `pageSize` el tamaño del resultado, por lo que el hook de pacientes
conserva el tamaño solicitado. Replicar la semántica del dominio vecino.

## Cambio de contrato

1. Confirmar endpoint, método, auth, status y shape con backend.
2. Hacer el cambio aditivo cuando sea posible.
3. Actualizar entidad/schema antes del service.
4. Normalizar compatibilidad dentro del service o adapter.
5. Actualizar hook y UI sin filtrar detalles HTTP.
6. Probar éxito, validación, 401, 403, 404/409 si aplica y 5xx/red.
7. Documentar orden de despliegue si no existe compatibilidad hacia atrás.

No usar tipos del frontend como evidencia de que una columna o restricción
existe en base de datos.
