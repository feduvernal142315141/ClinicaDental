# Instrucciones Backend — Subida de imagen de símbolo en Servicios

## Contexto

El frontend ahora envía la imagen del símbolo del servicio (modo ASSET) como un **base64 data URI** en el campo `symbolImage` dentro del JSON de `POST /services` y `PUT /services`. Ya no envía `symbolUrl` ni `symbolPublicId` en la petición — esos campos ahora son responsabilidad exclusiva del backend (generados tras subir a Cloudinary).

## Cambios en el contrato de request

### `POST /services` y `PUT /services`

**Campo nuevo en el body JSON:**

| Campo         | Tipo     | Requerido                                   | Descripción                                                         |
| ------------- | -------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `symbolImage` | `string` | Sí cuando `odontogramSymbolMode` es `ASSET` | Data URI base64 de la imagen (ej: `data:image/png;base64,iVBOR...`) |

**Campos eliminados del request:**

| Campo            | Notas                                                |
| ---------------- | ---------------------------------------------------- |
| `symbolUrl`      | Ya no se envía desde el front. El backend lo genera. |
| `symbolPublicId` | Ya no se envía desde el front. El backend lo genera. |

## Lógica esperada en el backend

### Crear servicio (`POST /services`)

1. Si `odontogramSymbolMode === "ASSET"` y `symbolImage` está presente:
   - Decodificar el base64 (quitar el prefijo `data:image/...;base64,`).
   - Subir la imagen a **Cloudinary** (carpeta sugerida: `services/symbols/`).
   - Guardar en la entidad:
     - `symbolPublicId` → el `public_id` retornado por Cloudinary.
     - `symbolUrl` → la `secure_url` retornada por Cloudinary.
2. Si `odontogramSymbolMode !== "ASSET"`:
   - Ignorar `symbolImage`, `symbolPublicId` y `symbolUrl` (dejar null).

### Actualizar servicio (`PUT /services`)

1. Si `symbolImage` **está presente** (no null, no vacío):
   - Si el servicio tenía una imagen anterior (`symbolPublicId` existente), **eliminar la imagen anterior de Cloudinary**.
   - Subir la nueva imagen a Cloudinary.
   - Actualizar `symbolPublicId` y `symbolUrl` con los nuevos valores.
2. Si `symbolImage` **no está presente** (campo ausente o null):
   - **No modificar** `symbolPublicId` ni `symbolUrl` existentes (el usuario no cambió la imagen).
3. Si `odontogramSymbolMode` cambia de `ASSET` a otro modo:
   - Eliminar la imagen de Cloudinary si existía.
   - Limpiar `symbolPublicId` y `symbolUrl` (poner null).

### Respuesta

Los endpoints de lectura (`GET /services`, `GET /services/{id}`) siguen retornando estos campos como siempre:

```json
{
  "id": "...",
  "symbolPublicId": "services/symbols/abc123",
  "symbolUrl": "https://res.cloudinary.com/.../services/symbols/abc123.png",
  "symbolText": null,
  ...
}
```

## Validaciones sugeridas

- Validar que `symbolImage` sea un data URI válido (`data:image/(png|jpeg|jpg|svg+xml);base64,...`).
- Limitar el tamaño del base64 decodificado a **2 MB** máximo.
- Si `odontogramSymbolMode === "ASSET"` en un `POST`, `symbolImage` debe ser obligatorio.
- Formatos aceptados: `image/jpeg`, `image/png`, `image/jpg`, `image/svg+xml`.

## Ejemplo de request

```json
{
  "code": "SRV-001",
  "name": "Limpieza dental",
  "description": "Limpieza dental profesional",
  "type": "TREATMENT",
  "cost": 50.0,
  "odontogramEnabled": true,
  "odontogramSymbolMode": "ASSET",
  "symbolImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "symbolText": null
}
```
