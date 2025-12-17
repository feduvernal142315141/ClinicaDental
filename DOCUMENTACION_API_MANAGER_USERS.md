# 📚 Documentación API - Manager Users

## Descripción General

Esta documentación detalla todos los endpoints relacionados con la gestión de usuarios administradores (Manager Users) del sistema. La API está dividida en dos controladores principales:

1. **ManagerUserController** (`/manager-users`) - CRUD de usuarios administradores
2. **AuthManagerUserController** (`/managers-users/auth`) - Autenticación y gestión de sesiones

---

## 🔐 Autenticación

La mayoría de los endpoints requieren autenticación mediante **Bearer Token (JWT)**. Los tokens se obtienen a través del flujo de autenticación con OTP.

### Flujo de Autenticación

```
1. POST /managers-users/auth/login → Obtiene OTP
2. POST /managers-users/auth/validate-otp → Valida OTP y obtiene tokens
3. Usar accessToken en header: Authorization: Bearer {accessToken}
```

### Permisos Requeridos

Los endpoints de CRUD requieren el permiso `user` (USER_AUTHORITY). Este permiso debe estar asignado al rol del usuario autenticado.

---

## 📋 Endpoints de Autenticación

### Base URL: `/managers-users/auth`

---

### 1. Login - Iniciar Sesión

Inicia el proceso de autenticación enviando un código OTP al correo del usuario.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/managers-users/auth/login` |
| **Autenticación** | No requerida |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "email": "string",
  "password": "string"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | ✅ Sí | Correo electrónico del usuario |
| `password` | string | ✅ Sí | Contraseña del usuario |

#### Response (200 OK)

```json
{
  "otpCode": "string",
  "otpExpiresInSeconds": 300,
  "otpExpiresAt": "2025-12-16T10:30:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `otpCode` | string | Código OTP (solo visible en ambiente de desarrollo) |
| `otpExpiresInSeconds` | number | Tiempo de expiración en segundos |
| `otpExpiresAt` | Date | Fecha/hora de expiración del OTP |

#### Response (400 Bad Request)

```json
{
  "code": "string",
  "message": "string",
  "details": "string"
}
```

---

### 2. Validar OTP

Valida el código OTP y retorna los tokens de acceso.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/managers-users/auth/validate-otp` |
| **Autenticación** | No requerida |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "email": "string",
  "otpCode": "string"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | ✅ Sí | Correo electrónico del usuario |
| `otpCode` | string | ✅ Sí | Código OTP recibido |

#### Response (200 OK)

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "accessTokenExpiresIn": "2025-12-16T11:30:00.000Z",
  "refreshTokenExpiresIn": "2025-12-23T10:30:00.000Z",
  "passwordExpirationDate": "2026-03-16T10:30:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `accessToken` | string | Token JWT para autenticación |
| `refreshToken` | string | Token para renovar el accessToken |
| `accessTokenExpiresIn` | Date | Fecha de expiración del accessToken |
| `refreshTokenExpiresIn` | Date | Fecha de expiración del refreshToken |
| `passwordExpirationDate` | Date | Fecha de expiración de la contraseña |

> ⚠️ **Importante**: El frontend debe monitorear `passwordExpirationDate` para notificar al usuario cuando su contraseña esté próxima a vencer.

---

### 3. Refresh Token - Renovar Token

Renueva el token de acceso usando el refresh token.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/managers-users/auth/refresh-token` |
| **Autenticación** | Bearer Token |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "refreshToken": "string"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `refreshToken` | string | ✅ Sí | Token de renovación obtenido en login |

#### Response (200 OK)

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "accessExpiresIn": "2025-12-16T12:30:00.000Z",
  "refreshExpiresIn": "2025-12-23T11:30:00.000Z"
}
```

---

### 4. Logout - Cerrar Sesión

Invalida el refresh token actual.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/managers-users/auth/logout` |
| **Autenticación** | Bearer Token |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "refreshToken": "string"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `refreshToken` | string | ✅ Sí | Token de renovación a invalidar |

#### Response (200 OK)

```json
true
```

---

### 5. Forgot Password - Olvidé mi Contraseña

Inicia el proceso de recuperación de contraseña enviando un email con código de verificación.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/managers-users/auth/forgot-password` |
| **Autenticación** | No requerida |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "email": "string"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | ✅ Sí | Correo electrónico del usuario |

#### Response (200 OK)

```json
{
  "name": "string",
  "email": "string"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre del usuario |
| `email` | string | Correo donde se envió el código |

---

### 6. Reset Password - Restablecer Contraseña

Establece una nueva contraseña usando el código de verificación.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/managers-users/auth/reset-password` |
| **Autenticación** | No requerida |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "code": "string",
  "password": "string"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `code` | string | ✅ Sí | Código de verificación recibido por email |
| `password` | string | ✅ Sí | Nueva contraseña |

#### Validaciones de Contraseña

La contraseña debe cumplir con:
- Longitud entre **8 y 20 caracteres**
- Al menos **1 número** (0-9)
- Al menos **1 letra minúscula** (a-z)
- Al menos **1 letra mayúscula** (A-Z)
- Al menos **1 carácter especial** (!@#&()–{}:;',?/*~$^+=<>)

#### Response (200 OK)

```json
true
```

---

## 📋 Endpoints de Gestión de Usuarios

### Base URL: `/manager-users`

---

### 7. Crear Usuario

Crea un nuevo usuario administrador.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/manager-users` |
| **Autenticación** | Bearer Token |
| **Permiso Requerido** | `user` |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "identificationTypeId": "uuid",
  "identificationNumber": "string",
  "names": "string",
  "surnames": "string",
  "email": "string",
  "cellphone": "string",
  "password": "string",
  "roleId": "uuid",
  "financialInstitutions": ["uuid", "uuid"],
  "active": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `identificationTypeId` | UUID | ✅ Sí | ID del tipo de identificación |
| `identificationNumber` | string | ✅ Sí | Número de documento de identidad |
| `names` | string | ✅ Sí | Nombres del usuario |
| `surnames` | string | ❌ No | Apellidos del usuario |
| `email` | string | ✅ Sí | Correo electrónico (formato válido) |
| `cellphone` | string | ❌ No | Número de teléfono celular |
| `password` | string | ✅ Sí | Contraseña (ver validaciones) |
| `roleId` | UUID | ✅ Sí | ID del rol asignado |
| `financialInstitutions` | UUID[] | ✅ Sí | Lista de IDs de instituciones financieras (mínimo 1) |
| `active` | boolean | ✅ Sí | Estado activo/inactivo del usuario |

#### Validaciones

- `names`: No puede estar vacío
- `identificationNumber`: No puede estar vacío
- `email`: No puede estar vacío y debe tener formato válido (`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$`)
- `financialInstitutions`: Debe contener al menos una institución financiera

#### Response (201 Created)

```json
"550e8400-e29b-41d4-a716-446655440000"
```

> Retorna el UUID del usuario creado.

---

### 8. Actualizar Usuario

Actualiza los datos de un usuario existente.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `PUT` |
| **URL** | `/manager-users` |
| **Autenticación** | Bearer Token |
| **Permiso Requerido** | `user` |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "id": "uuid",
  "identificationTypeId": "uuid",
  "identificationNumber": "string",
  "names": "string",
  "surnames": "string",
  "email": "string",
  "cellphone": "string",
  "password": "string",
  "roleId": "uuid",
  "financialInstitutions": ["uuid", "uuid"],
  "active": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | ✅ Sí | ID del usuario a actualizar |
| `identificationTypeId` | UUID | ✅ Sí | ID del tipo de identificación |
| `identificationNumber` | string | ✅ Sí | Número de documento de identidad |
| `names` | string | ✅ Sí | Nombres del usuario |
| `surnames` | string | ❌ No | Apellidos del usuario |
| `email` | string | ✅ Sí | Correo electrónico (formato válido) |
| `cellphone` | string | ❌ No | Número de teléfono celular |
| `password` | string | ❌ No | Nueva contraseña (opcional, solo si se desea cambiar) |
| `roleId` | UUID | ✅ Sí | ID del rol asignado |
| `financialInstitutions` | UUID[] | ✅ Sí | Lista de IDs de instituciones financieras |
| `active` | boolean | ✅ Sí | Estado activo/inactivo del usuario |

#### Response (200 OK)

```json
true
```

---

### 9. Obtener Usuario por ID

Obtiene los detalles de un usuario específico.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **URL** | `/manager-users/{id}` |
| **Autenticación** | Bearer Token |
| **Permiso Requerido** | `user` |

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | UUID | ID del usuario a consultar |

#### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "identificationType": {
    "id": "uuid",
    "name": "Cédula de Ciudadanía",
    "createAt": "2025-01-01T00:00:00.000Z"
  },
  "identificationNumber": "1234567890",
  "names": "Juan Carlos",
  "surnames": "Pérez García",
  "email": "juan.perez@empresa.com",
  "cellphone": "+573001234567",
  "role": {
    "id": "uuid",
    "name": "Administrador",
    "createAt": "2025-01-01T00:00:00.000Z",
    "permissions": ["uuid1", "uuid2", "uuid3"]
  },
  "financialInstitutions": ["uuid1", "uuid2"],
  "active": true,
  "createAt": "2025-06-15T10:30:00.000Z"
}
```

#### Modelo de Respuesta Detallado

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único del usuario |
| `identificationType` | Object | Tipo de identificación |
| `identificationType.id` | UUID | ID del tipo de identificación |
| `identificationType.name` | string | Nombre del tipo (ej: "Cédula") |
| `identificationType.createAt` | Date | Fecha de creación |
| `identificationNumber` | string | Número de documento |
| `names` | string | Nombres del usuario |
| `surnames` | string | Apellidos del usuario |
| `email` | string | Correo electrónico |
| `cellphone` | string | Teléfono celular |
| `role` | Object | Rol asignado |
| `role.id` | UUID | ID del rol |
| `role.name` | string | Nombre del rol |
| `role.createAt` | Date | Fecha de creación del rol |
| `role.permissions` | UUID[] | Lista de IDs de permisos |
| `financialInstitutions` | UUID[] | IDs de instituciones financieras asignadas |
| `active` | boolean | Estado del usuario |
| `createAt` | Date | Fecha de creación del usuario |

---

### 10. Listar Usuarios (Paginado)

Obtiene una lista paginada de usuarios con filtros y ordenamiento.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **URL** | `/manager-users` |
| **Autenticación** | Bearer Token |
| **Permiso Requerido** | `user` |

#### Query Parameters

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `page` | int | ❌ No | 0 | Número de página (base 0) |
| `pageSize` | int | ❌ No | 0 | Tamaño de página (0 = todos) |
| `filters` | string[] | ❌ No | - | Filtros a aplicar |
| `orders` | string[] | ❌ No | - | Ordenamiento |

#### Formato de Filtros

Los filtros se envían como strings con el siguiente formato:

```
campo,operador,valor
```

**Operadores disponibles:**
- `eq` - Igual a
- `ne` - No igual a
- `gt` - Mayor que
- `gte` - Mayor o igual que
- `lt` - Menor que
- `lte` - Menor o igual que
- `contains` - Contiene (para strings)
- `startsWith` - Comienza con
- `endsWith` - Termina con

**Prefijos de tipo para valores:**
- `integer:` - Para valores enteros
- `double:` - Para valores decimales
- `boolean:` - Para booleanos
- `date:` - Para fechas (formato: yyyy-MM-dd)
- `datetime:` - Para fecha/hora (formato: yyyy-MM-dd HH:mm:ss)

**Ejemplos:**
```
?filters=names,contains,Juan
?filters=active,eq,boolean:true
?filters=createAt,gte,date:2025-01-01
```

#### Formato de Ordenamiento

```
campo,direccion
```

**Direcciones:**
- `asc` - Ascendente
- `desc` - Descendente

**Ejemplo:**
```
?orders=createAt,desc&orders=names,asc
```

#### Response (200 OK)

```json
{
  "entities": [
    {
      "id": "uuid",
      "identificationNumber": "1234567890",
      "names": "Juan Carlos",
      "surnames": "Pérez García",
      "email": "juan.perez@empresa.com",
      "cellphone": "+573001234567",
      "role": {
        "id": "uuid",
        "name": "Administrador",
        "createAt": "2025-01-01T00:00:00.000Z",
        "permissions": ["uuid1", "uuid2"]
      },
      "active": true,
      "createAt": "2025-06-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 0,
    "pageSize": 10,
    "total": 50
  }
}
```

#### Modelo de Paginación

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `entities` | Array | Lista de usuarios |
| `pagination.page` | int | Página actual |
| `pagination.pageSize` | int | Elementos por página |
| `pagination.total` | long | Total de registros |

---

### 11. Cambiar Contraseña

Permite a un usuario cambiar su propia contraseña.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `PUT` |
| **URL** | `/manager-users/change-password` |
| **Autenticación** | Bearer Token |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "managerUserId": "uuid",
  "oldPassword": "string",
  "newPassword": "string"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `managerUserId` | UUID | ✅ Sí | ID del usuario |
| `oldPassword` | string | ✅ Sí | Contraseña actual |
| `newPassword` | string | ✅ Sí | Nueva contraseña |

#### Validaciones de Nueva Contraseña

- Longitud entre **8 y 20 caracteres**
- Al menos **1 número** (0-9)
- Al menos **1 letra minúscula** (a-z)
- Al menos **1 letra mayúscula** (A-Z)
- Al menos **1 carácter especial** (!@#&()–{}:;',?/*~$^+=<>)

#### Response (200 OK)

```json
true
```

---

## 🚨 Manejo de Errores

### Estructura de Error

Todos los errores retornan la siguiente estructura:

```json
{
  "code": "string",
  "message": "string",
  "details": "string"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `code` | string | Código de error (puede estar vacío) |
| `message` | string | Mensaje de error para mostrar al usuario |
| `details` | string | Detalles técnicos del error |

### Códigos HTTP Comunes

| Código | Significado | Descripción |
|--------|-------------|-------------|
| `200` | OK | Solicitud exitosa |
| `201` | Created | Recurso creado exitosamente |
| `400` | Bad Request | Error de validación o datos incorrectos |
| `401` | Unauthorized | Token no válido o expirado |
| `403` | Forbidden | Sin permisos suficientes |
| `404` | Not Found | Recurso no encontrado |
| `500` | Internal Server Error | Error interno del servidor |

### Errores de Validación Comunes

| Error | Causa |
|-------|-------|
| "Los nombres no pueden estar vacíos" | Campo `names` vacío |
| "El número de identificación no puede estar vacío" | Campo `identificationNumber` vacío |
| "El correo eléctronico no puede estar vacío" | Campo `email` vacío |
| "formato de correo eléctronico no válido" | Email con formato incorrecto |
| "Debe seleccionar al menos una entidad financiera" | `financialInstitutions` vacío o null |

---

## 📝 Ejemplos de Uso

### Ejemplo Completo: Flujo de Login

```javascript
// 1. Solicitar OTP
const loginResponse = await fetch('/managers-users/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'usuario@empresa.com',
    password: 'MiPassword123!'
  })
});

const { otpExpiresAt } = await loginResponse.json();

// 2. Validar OTP (usuario ingresa código recibido por email)
const validateResponse = await fetch('/managers-users/auth/validate-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'usuario@empresa.com',
    otpCode: '123456'
  })
});

const { accessToken, refreshToken, passwordExpirationDate } = await validateResponse.json();

// 3. Usar token en siguientes peticiones
const usersResponse = await fetch('/manager-users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Ejemplo: Crear Usuario

```javascript
const createUserResponse = await fetch('/manager-users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    identificationTypeId: '550e8400-e29b-41d4-a716-446655440001',
    identificationNumber: '1234567890',
    names: 'María',
    surnames: 'González López',
    email: 'maria.gonzalez@empresa.com',
    cellphone: '+573001234567',
    password: 'Password123!',
    roleId: '550e8400-e29b-41d4-a716-446655440002',
    financialInstitutions: [
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004'
    ],
    active: true
  })
});

const userId = await createUserResponse.json();
console.log('Usuario creado con ID:', userId);
```

### Ejemplo: Listar Usuarios con Filtros

```javascript
const params = new URLSearchParams({
  page: '0',
  pageSize: '10'
});

// Agregar múltiples filtros
params.append('filters', 'active,eq,boolean:true');
params.append('filters', 'names,contains,Juan');
params.append('orders', 'createAt,desc');

const response = await fetch(`/manager-users?${params.toString()}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { entities, pagination } = await response.json();
console.log(`Mostrando ${entities.length} de ${pagination.total} usuarios`);
```

---

## 🔄 Renovación de Tokens

El frontend debe implementar lógica para renovar tokens automáticamente:

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('/managers-users/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });
  
  if (response.ok) {
    return await response.json();
  }
  
  // Si falla, redirigir al login
  window.location.href = '/login';
}
```

---

## 📊 Resumen de Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/managers-users/auth/login` | Iniciar sesión (obtener OTP) | ❌ |
| POST | `/managers-users/auth/validate-otp` | Validar OTP y obtener tokens | ❌ |
| POST | `/managers-users/auth/logout` | Cerrar sesión | ✅ |
| POST | `/managers-users/auth/forgot-password` | Solicitar recuperación de contraseña | ❌ |
| POST | `/managers-users/auth/reset-password` | Restablecer contraseña | ❌ |
| POST | `/managers-users/auth/refresh-token` | Renovar token de acceso | ✅ |
| POST | `/manager-users` | Crear usuario | ✅ (user) |
| PUT | `/manager-users` | Actualizar usuario | ✅ (user) |
| GET | `/manager-users/{id}` | Obtener usuario por ID | ✅ (user) |
| GET | `/manager-users` | Listar usuarios (paginado) | ✅ (user) |
| PUT | `/manager-users/change-password` | Cambiar contraseña | ✅ |

---

## ⚠️ Notas Importantes para el Frontend

1. **Expiración de Contraseña**: El sistema envía notificaciones automáticas cuando la contraseña está próxima a vencer. El frontend debe mostrar alertas basándose en `passwordExpirationDate`.

2. **Manejo de Tokens**: 
   - Almacenar tokens de forma segura (preferiblemente en memoria o httpOnly cookies)
   - Implementar renovación automática antes de que expire el `accessToken`
   - Limpiar tokens al hacer logout

3. **Sanitización de Datos**: El backend sanitiza todos los inputs, pero el frontend también debe validar datos antes de enviarlos.

4. **Instituciones Financieras**: Siempre debe seleccionarse al menos una institución financiera al crear/actualizar usuarios.

5. **Formato de Fechas**: Todas las fechas se manejan en formato ISO 8601 (ej: `2025-12-16T10:30:00.000Z`).

---

**Versión del documento**: 1.0  
**Última actualización**: 16 de diciembre de 2025  
**Aplicable para**: Backend Clinic API
