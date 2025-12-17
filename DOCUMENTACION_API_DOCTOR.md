# 📚 Documentación API - Doctor (Users)

## ⚠️ Nota sobre el Refactor

> **Importante para el equipo Frontend**: Debido a un refactor reciente, los endpoints que anteriormente se conocían como "doctors" ahora representan a los **usuarios del sistema** (médicos/doctores). La nomenclatura interna mantiene "doctor" pero conceptualmente estos endpoints gestionan a los usuarios que operan en el sistema clínico.

## Descripción General

Esta documentación detalla todos los endpoints relacionados con la gestión de doctores/usuarios del sistema clínico. La API está dividida en dos controladores principales:

1. **DoctorController** (`/doctor`) - CRUD de doctores/usuarios
2. **AuthDoctorController** (`/auth`) - Autenticación y gestión de sesiones

---

## 🔐 Autenticación

La mayoría de los endpoints requieren autenticación mediante **Bearer Token (JWT)**. Los tokens se obtienen a través del flujo de autenticación con OTP.

### Flujo de Autenticación

```
1. POST /auth/login → Obtiene OTP (código enviado al email)
2. POST /auth/validate-otp → Valida OTP y obtiene tokens JWT
3. Usar accessToken en header: Authorization: Bearer {accessToken}
```

### Permisos Requeridos

Los endpoints de CRUD requieren el permiso `user` (USER_AUTHORITY). Este permiso debe estar asignado al rol del usuario autenticado.

---

## 📋 Endpoints de Autenticación

### Base URL: `/auth`

---

### 1. Login - Iniciar Sesión

Inicia el proceso de autenticación enviando un código OTP al correo del doctor/usuario.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/auth/login` |
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
| `email` | string | ✅ Sí | Correo electrónico del doctor |
| `password` | string | ✅ Sí | Contraseña del doctor |

#### Response (200 OK)

```json
{
  "otpCode": "string",
  "otpExpiresInSeconds": 300,
  "otpExpiresAt": "2025-12-17T10:30:00.000Z"
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
| **URL** | `/auth/validate-otp` |
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
| `email` | string | ✅ Sí | Correo electrónico del doctor |
| `otpCode` | string | ✅ Sí | Código OTP de 6 dígitos recibido por email |

#### Response (200 OK)

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "accessTokenExpiresIn": "2025-12-17T11:30:00.000Z",
  "refreshTokenExpiresIn": "2025-12-24T10:30:00.000Z",
  "passwordExpirationDate": "2026-03-17T10:30:00.000Z"
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
| **URL** | `/auth/refresh-token` |
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
  "accessExpiresIn": "2025-12-17T12:30:00.000Z",
  "refreshExpiresIn": "2025-12-24T11:30:00.000Z"
}
```

---

### 4. Logout - Cerrar Sesión

Invalida el refresh token actual.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/auth/logout` |
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
| **URL** | `/auth/forgot-password` |
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
| `email` | string | ✅ Sí | Correo electrónico del doctor |

#### Response (200 OK)

```json
{
  "name": "string",
  "email": "string"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre del doctor |
| `email` | string | Correo donde se envió el código |

---

### 6. Reset Password - Restablecer Contraseña

Establece una nueva contraseña usando el código de verificación.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/auth/reset-password` |
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

## 📋 Endpoints de Gestión de Doctores

### Base URL: `/doctor`

---

### 7. Crear Doctor

Crea un nuevo doctor/usuario en el sistema.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **URL** | `/doctor` |
| **Autenticación** | Bearer Token |
| **Permiso Requerido** | `user` |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "specialty": "string",
  "licenceNumber": "string",
  "description": "string",
  "schedule": "string (JSON)",
  "gender": "string",
  "roleId": "uuid",
  "active": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | ✅ Sí | Nombre completo del doctor |
| `email` | string | ✅ Sí | Correo electrónico (formato válido) |
| `phone` | string | ❌ No | Número de teléfono |
| `specialty` | string | ❌ No | Especialidad médica |
| `licenceNumber` | string | ✅ Sí | Número de licencia/matrícula profesional |
| `description` | string | ❌ No | Descripción o biografía del doctor |
| `schedule` | string | ❌ No | Horario de atención en formato JSON (ver estructura abajo) |
| `gender` | string | ❌ No | Género del doctor |
| `roleId` | UUID | ✅ Sí | ID del rol asignado |
| `active` | boolean | ✅ Sí | Estado activo/inactivo del doctor |

#### Estructura del Schedule (JSON String)

El campo `schedule` es un string JSON que representa los horarios de atención por día de la semana:

```json
{
  "monday": {
    "enabled": true,
    "startTime": "08:00",
    "endTime": "18:00",
    "breakStart": "12:00",
    "breakEnd": "14:00"
  },
  "tuesday": {
    "enabled": true,
    "startTime": "08:00",
    "endTime": "18:00",
    "breakStart": "12:00",
    "breakEnd": "14:00"
  },
  "wednesday": {
    "enabled": true,
    "startTime": "08:00",
    "endTime": "18:00",
    "breakStart": null,
    "breakEnd": null
  },
  "thursday": {
    "enabled": false,
    "startTime": null,
    "endTime": null,
    "breakStart": null,
    "breakEnd": null
  },
  "friday": {
    "enabled": true,
    "startTime": "09:00",
    "endTime": "17:00",
    "breakStart": "13:00",
    "breakEnd": "14:00"
  },
  "saturday": {
    "enabled": false,
    "startTime": null,
    "endTime": null,
    "breakStart": null,
    "breakEnd": null
  },
  "sunday": {
    "enabled": false,
    "startTime": null,
    "endTime": null,
    "breakStart": null,
    "breakEnd": null
  }
}
```

##### Modelo Schedule por Día

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `enabled` | boolean | Si el doctor atiende ese día |
| `startTime` | string | Hora de inicio de atención (formato HH:mm) |
| `endTime` | string | Hora de fin de atención (formato HH:mm) |
| `breakStart` | string | Hora de inicio de descanso (formato HH:mm, nullable) |
| `breakEnd` | string | Hora de fin de descanso (formato HH:mm, nullable) |

#### Validaciones

- `name`: No puede estar vacío
- `licenceNumber`: No puede estar vacío
- `email`: No puede estar vacío y debe tener formato válido (`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$`)

#### Response (201 Created)

```json
"550e8400-e29b-41d4-a716-446655440000"
```

> Retorna el UUID del doctor creado.

---

### 8. Actualizar Doctor

Actualiza los datos de un doctor existente.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `PUT` |
| **URL** | `/doctor` |
| **Autenticación** | Bearer Token |
| **Permiso Requerido** | `user` |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "phone": "string",
  "specialty": "string",
  "licenceNumber": "string",
  "description": "string",
  "schedule": "string (JSON)",
  "gender": "string",
  "roleId": "uuid",
  "password": "string",
  "active": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | ✅ Sí | ID del doctor a actualizar |
| `name` | string | ✅ Sí | Nombre completo del doctor |
| `email` | string | ✅ Sí | Correo electrónico (formato válido) |
| `phone` | string | ❌ No | Número de teléfono |
| `specialty` | string | ❌ No | Especialidad médica |
| `licenceNumber` | string | ✅ Sí | Número de licencia/matrícula profesional |
| `description` | string | ❌ No | Descripción o biografía del doctor |
| `schedule` | string | ❌ No | Horario de atención en formato JSON |
| `gender` | string | ❌ No | Género del doctor |
| `roleId` | UUID | ✅ Sí | ID del rol asignado |
| `password` | string | ❌ No | Nueva contraseña (solo si se desea cambiar) |
| `active` | boolean | ✅ Sí | Estado activo/inactivo del doctor |

#### Response (200 OK)

```json
true
```

---

### 9. Obtener Doctor por ID

Obtiene los detalles completos de un doctor específico.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **URL** | `/doctor/{id}` |
| **Autenticación** | Bearer Token |
| **Permiso Requerido** | `user` |

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | UUID | ID del doctor a consultar |

#### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Dr. Juan Carlos Pérez",
  "email": "juan.perez@clinica.com",
  "phone": "+573001234567",
  "specialty": "Cardiología",
  "licenceNumber": "MP-123456",
  "description": "Cardiólogo con más de 10 años de experiencia...",
  "schedule": "{\"monday\":{\"enabled\":true,\"startTime\":\"08:00\",\"endTime\":\"18:00\",\"breakStart\":\"12:00\",\"breakEnd\":\"14:00\"}}",
  "gender": "Masculino",
  "roleId": "uuid",
  "role": {
    "id": "uuid",
    "name": "Doctor",
    "createAt": "2025-01-01T00:00:00.000Z",
    "permissions": ["uuid1", "uuid2", "uuid3"]
  },
  "active": true,
  "createAt": "2025-06-15T10:30:00.000Z"
}
```

#### Modelo de Respuesta Detallado

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único del doctor |
| `name` | string | Nombre completo |
| `email` | string | Correo electrónico |
| `phone` | string | Teléfono de contacto |
| `specialty` | string | Especialidad médica |
| `licenceNumber` | string | Número de licencia profesional |
| `description` | string | Descripción/biografía |
| `schedule` | string | Horario en formato JSON string |
| `gender` | string | Género |
| `roleId` | UUID | ID del rol asignado |
| `role` | Object | Información del rol |
| `role.id` | UUID | ID del rol |
| `role.name` | string | Nombre del rol |
| `role.createAt` | Date | Fecha de creación del rol |
| `role.permissions` | UUID[] | Lista de IDs de permisos |
| `active` | boolean | Estado del doctor |
| `createAt` | Date | Fecha de creación del registro |

---

### 10. Listar Doctores (Paginado)

Obtiene una lista paginada de doctores con filtros y ordenamiento.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **URL** | `/doctor` |
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

**Ejemplos de Filtros:**
```
?filters=name,contains,Juan
?filters=active,eq,boolean:true
?filters=specialty,eq,Cardiología
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
?orders=createAt,desc&orders=name,asc
```

#### Response (200 OK)

```json
{
  "entities": [
    {
      "id": "uuid",
      "licenceNumber": "MP-123456",
      "name": "Dr. Juan Carlos Pérez",
      "email": "juan.perez@clinica.com",
      "phone": "+573001234567",
      "role": {
        "id": "uuid",
        "name": "Doctor",
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

#### Modelo de Respuesta del Listado (Simplificado)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `licenceNumber` | string | Número de licencia |
| `name` | string | Nombre completo |
| `email` | string | Correo electrónico |
| `phone` | string | Teléfono |
| `role` | Object | Información del rol |
| `active` | boolean | Estado del doctor |
| `createAt` | Date | Fecha de creación |

> **Nota**: El listado retorna menos campos que el detalle individual para optimizar la transferencia de datos.

#### Modelo de Paginación

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `entities` | Array | Lista de doctores |
| `pagination.page` | int | Página actual |
| `pagination.pageSize` | int | Elementos por página |
| `pagination.total` | long | Total de registros |

---

### 11. Cambiar Contraseña

Permite a un doctor cambiar su propia contraseña.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `PUT` |
| **URL** | `/doctor/change-password` |
| **Autenticación** | Bearer Token |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "doctorId": "uuid",
  "oldPassword": "string",
  "newPassword": "string"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `doctorId` | UUID | ✅ Sí | ID del doctor |
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
| "Los nombres no pueden estar vacíos" | Campo `name` vacío |
| "El número de identificación no puede estar vacío" | Campo `licenceNumber` vacío |
| "El correo eléctronico no puede estar vacío" | Campo `email` vacío |
| "formato de correo eléctronico no válido" | Email con formato incorrecto |

---

## 📝 Ejemplos de Uso

### Ejemplo Completo: Flujo de Login

```javascript
// 1. Solicitar OTP
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@clinica.com',
    password: 'MiPassword123!'
  })
});

const { otpExpiresAt } = await loginResponse.json();
console.log('OTP enviado. Expira en:', otpExpiresAt);

// 2. Validar OTP (usuario ingresa código recibido por email)
const validateResponse = await fetch('/auth/validate-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@clinica.com',
    otpCode: '123456'
  })
});

const { accessToken, refreshToken, passwordExpirationDate } = await validateResponse.json();

// 3. Usar token en siguientes peticiones
const doctorsResponse = await fetch('/doctor', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Ejemplo: Crear Doctor con Horario

```javascript
const schedule = {
  monday: {
    enabled: true,
    startTime: "08:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "14:00"
  },
  tuesday: {
    enabled: true,
    startTime: "08:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "14:00"
  },
  wednesday: {
    enabled: true,
    startTime: "08:00",
    endTime: "18:00",
    breakStart: null,
    breakEnd: null
  },
  thursday: {
    enabled: false,
    startTime: null,
    endTime: null,
    breakStart: null,
    breakEnd: null
  },
  friday: {
    enabled: true,
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "13:00",
    breakEnd: "14:00"
  },
  saturday: { enabled: false, startTime: null, endTime: null, breakStart: null, breakEnd: null },
  sunday: { enabled: false, startTime: null, endTime: null, breakStart: null, breakEnd: null }
};

const createDoctorResponse = await fetch('/doctor', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Dr. María González',
    email: 'maria.gonzalez@clinica.com',
    phone: '+573001234567',
    specialty: 'Dermatología',
    licenceNumber: 'MP-789012',
    description: 'Dermatóloga especialista en tratamientos estéticos',
    schedule: JSON.stringify(schedule),  // Importante: convertir a string
    gender: 'Femenino',
    roleId: '550e8400-e29b-41d4-a716-446655440002',
    active: true
  })
});

const doctorId = await createDoctorResponse.json();
console.log('Doctor creado con ID:', doctorId);
```

### Ejemplo: Listar Doctores con Filtros

```javascript
const params = new URLSearchParams({
  page: '0',
  pageSize: '10'
});

// Filtrar doctores activos de cardiología
params.append('filters', 'active,eq,boolean:true');
params.append('filters', 'specialty,contains,Cardiolog');
params.append('orders', 'name,asc');

const response = await fetch(`/doctor?${params.toString()}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { entities, pagination } = await response.json();
console.log(`Mostrando ${entities.length} de ${pagination.total} doctores`);
```

### Ejemplo: Parsear Schedule del Response

```javascript
// Al recibir un doctor del backend
const doctor = await fetch(`/doctor/${doctorId}`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
}).then(res => res.json());

// Parsear el schedule de string JSON a objeto
const schedule = JSON.parse(doctor.schedule);

// Acceder a horarios específicos
if (schedule.monday.enabled) {
  console.log(`Lunes: ${schedule.monday.startTime} - ${schedule.monday.endTime}`);
  if (schedule.monday.breakStart) {
    console.log(`  Descanso: ${schedule.monday.breakStart} - ${schedule.monday.breakEnd}`);
  }
}
```

---

## 🔄 Renovación de Tokens

El frontend debe implementar lógica para renovar tokens automáticamente:

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('/auth/refresh-token', {
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

// Interceptor para renovación automática
async function fetchWithAuth(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.status === 401) {
    const newTokens = await refreshAccessToken(refreshToken);
    accessToken = newTokens.accessToken;
    refreshToken = newTokens.refreshToken;
    
    // Reintentar con nuevo token
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }
  
  return response;
}
```

---

## 📊 Resumen de Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Iniciar sesión (obtener OTP) | ❌ |
| POST | `/auth/validate-otp` | Validar OTP y obtener tokens | ❌ |
| POST | `/auth/logout` | Cerrar sesión | ✅ |
| POST | `/auth/forgot-password` | Solicitar recuperación de contraseña | ❌ |
| POST | `/auth/reset-password` | Restablecer contraseña | ❌ |
| POST | `/auth/refresh-token` | Renovar token de acceso | ✅ |
| POST | `/doctor` | Crear doctor | ✅ (user) |
| PUT | `/doctor` | Actualizar doctor | ✅ (user) |
| GET | `/doctor/{id}` | Obtener doctor por ID | ✅ (user) |
| GET | `/doctor` | Listar doctores (paginado) | ✅ (user) |
| PUT | `/doctor/change-password` | Cambiar contraseña | ✅ |

---

## 🔗 Diferencias con Manager Users

| Aspecto | Doctor (`/doctor`) | Manager User (`/manager-users`) |
|---------|-------------------|--------------------------------|
| **Propósito** | Usuarios médicos del sistema clínico | Administradores del sistema |
| **Auth URL** | `/auth/*` | `/managers-users/auth/*` |
| **Campos únicos** | `specialty`, `licenceNumber`, `schedule`, `description`, `gender` | `identificationTypeId`, `identificationNumber`, `surnames`, `financialInstitutions` |
| **Validaciones** | Requiere `licenceNumber` | Requiere `financialInstitutions` |

---

## ⚠️ Notas Importantes para el Frontend

1. **Schedule como JSON String**: El campo `schedule` se envía y recibe como un string JSON. El frontend debe usar `JSON.stringify()` al enviar y `JSON.parse()` al recibir.

2. **Expiración de Contraseña**: El sistema envía notificaciones automáticas cuando la contraseña está próxima a vencer. El frontend debe mostrar alertas basándose en `passwordExpirationDate`.

3. **Manejo de Tokens**: 
   - Almacenar tokens de forma segura
   - Implementar renovación automática antes de que expire el `accessToken`
   - Limpiar tokens al hacer logout

4. **Diferencia en URLs de Auth**: 
   - Doctores: `/auth/*`
   - Manager Users: `/managers-users/auth/*`

5. **Formato de Fechas**: Todas las fechas se manejan en formato ISO 8601 (ej: `2025-12-17T10:30:00.000Z`).

6. **Formato de Horas en Schedule**: Las horas se manejan en formato 24 horas (`HH:mm`), ej: `"08:00"`, `"14:30"`.

---

**Versión del documento**: 1.0  
**Última actualización**: 17 de diciembre de 2025  
**Aplicable para**: Backend Clinic API - Módulo Doctor/Users
