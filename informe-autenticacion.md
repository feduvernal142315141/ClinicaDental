# Informe de Autenticación: Login, OTP y Cambio de Contraseña

Este informe describe la implementación del flujo de autenticación del backoffice: inicio de sesión (Login), validación de código OTP, recuperación y cambio de contraseña, incluyendo la comunicación con el backend, cifrado de contraseñas, manejo de sesión y tiempos, y componentes clave de la UI.

## Visión General del Flujo

- Login captura `email` y `password` y envía la contraseña cifrada vía RSA al backend.
- El backend puede responder con:
  - Solicitud de OTP (flujo: navegar a validador OTP, iniciar timer, permitir reenvío y verificación).
  - Token de acceso (flujo: decodificar JWT, persistir sesión, redirigir a dashboard o a cambio de contraseña si `changePassword=true`).
- Recuperación de contraseña solicita el email y envía un enlace/token de recuperación.
- Cambio de contraseña consume un `code` JWT desde la URL, valida su vigencia, aplica validaciones de complejidad y envía la nueva contraseña cifrada.

## Comunicación con el Backend

Patrón de arquitectura: Controllers → Commands → Repository → Axios

- Controlador: [src/infrastructure/controllers/usersControllers/managerUserAuthController.ts](src/infrastructure/controllers/usersControllers/managerUserAuthController.ts)
- Repositorio: [src/infrastructure/repositories/usersRepositories/managerUserAuthRepository.ts](src/infrastructure/repositories/usersRepositories/managerUserAuthRepository.ts)
- Cliente HTTP: [src/infrastructure/dataSources/http/axios.ts](src/infrastructure/dataSources/http/axios.ts)

Endpoints utilizados (prefijo `process.env.REACT_APP_URL_BASE`):

- Login: `/managers-users/auth/login`
- Validar OTP: `/managers-users/auth/validate-otp`
- Reenviar OTP: `/managers-users/auth/resend-otp`
- Reset OTP (nuevo código por token): `/managers-users/auth/reset-otp-code`
- Refresh token: `/managers-users/auth/refresh-token`
- Olvidé contraseña: `/managers-users/auth/forgot-password`
- Reset password: `/managers-users/auth/reset-password`
- Logout: `/managers-users/auth/logout`

El helper `sendRequest` gestiona respuestas y errores uniformemente: [src/infrastructure/dataSources/http/axios.ts](src/infrastructure/dataSources/http/axios.ts).

## Login

- UI: [src/presentation/pages/auth/login/index.tsx](src/presentation/pages/auth/login/index.tsx)
- Lógica: [src/presentation/pages/auth/login/hook/useLoginPage.ts](src/presentation/pages/auth/login/hook/useLoginPage.ts)

Flujo:

- Validaciones básicas de campos (`UsernameValidator`, `PasswordValidator`).
- Cifrado RSA de la contraseña con `encryptRsa` antes de enviar.
- Llamada a `ManagerUserAuthController.login(...)`:
  - Si la respuesta es OTP (`isOTPResponse`), se guarda la sesión OTP y se navega a `/validator-otp-code`.
  - Si la respuesta es token (`isTokenResponse`), se decodifica el JWT, se almacena en `localStorage` y Redux, y se redirige a `/dashboard` o `/reset-password` según `changePassword`.
- Gestión de sesión al acceder a rutas de autenticación: [src/presentation/utils/authSessionManager.ts](src/presentation/utils/authSessionManager.ts).

Componentes de entrada:

- Usuario: [src/presentation/pages/auth/login/components/UsernameInput.tsx](src/presentation/pages/auth/login/components/UsernameInput.tsx) (tipo email, accesible, con mensajes de error i18n).
- Contraseña: [src/presentation/pages/auth/login/components/PasswordInput.tsx](src/presentation/pages/auth/login/components/PasswordInput.tsx) (toggle mostrar/ocultar, control de errores y accesibilidad).

## Cifrado de Contraseña (RSA)

- Utilidad: [src/infrastructure/utils/encrypt.ts](src/infrastructure/utils/encrypt.ts)
- Obtiene la clave pública via query `getPublicKeyQuery` y la cachea.
- Usa `jsencrypt` para cifrar el texto plano antes de enviarlo.
- Si falla la obtención o el cifrado, retorna cadena vacía y registra error.

## Validación OTP

- Pantalla: [src/presentation/pages/auth/validatorOtpCode/index.tsx](src/presentation/pages/auth/validatorOtpCode/index.tsx)
- Sesión OTP: [src/presentation/pages/auth/validatorOtpCode/hooks/useOTPSession.ts](src/presentation/pages/auth/validatorOtpCode/hooks/useOTPSession.ts)
- Timer optimizado: [src/presentation/pages/auth/validatorOtpCode/hooks/useOtpTimerOptimized.ts](src/presentation/pages/auth/validatorOtpCode/hooks/useOtpTimerOptimized.ts)

Elementos clave:

- `useOTPSession` guarda `email`, expiración (`otpExpiresAt`, `otpExpiresInSeconds`), `otpResetCode`, `sessionStartTime`, `sessionToken` y `isActive` en `localStorage`.
  - Capado de duración: máximo 180 segundos.
  - `validateOTPAccess()`: verifica que la sesión exista, esté activa y tenga token.
  - `isRecentLoginAccess()`: acceso reciente desde login (≤ 180s).
  - `updateOTPExpiration()`: reestablece expiración tras reenvío.
  - `markSessionAsUsed()`: desactiva la sesión tras verificación exitosa.
  - `updateOtpResetCode()`: actualiza token de reenvío devuelto por el backend.
- `useOtpTimerOptimized` maneja el tiempo con Web Worker y fallback `setInterval`:
  - Estado: `timeLeft`, `formattedTime`, `isExpired`, `isRunning`.
  - No limpia la sesión al expirar (permite reenvío); solo se limpia tras verificación exitosa (`clearTimer`).
  - `restartTimer()` al reenviar OTP.

Componente de entrada del código:

- `react-verification-input` de 6 dígitos, solo numérico; controlado por estado `otpCode` y clases para estado visual.
- Restringe verificación hasta tener 6 dígitos; muestra errores y estados (verificando, reenvío disponible cuando expira).

Acciones de la pantalla:

- Verificar OTP (`ManagerUserAuthController.verifyOTP`): guarda sesión de usuario (JWT decodificado), marca sesión OTP usada y navega al home.
- Reenviar código (`ManagerUserAuthController.resetOTP`): requiere `otpResetCode`, reestablece expiración y reinicia el timer.

## Recuperación y Cambio de Contraseña

- Olvidé contraseña (solicitud de email): [src/presentation/pages/auth/forgotPassword/index.tsx](src/presentation/pages/auth/forgotPassword/index.tsx)

  - Envía `{ email }` a `/forgot-password` y muestra confirmación.
  - Invalida sesión si el usuario autenticado accede a esta ruta.

- Cambio de contraseña:
  - Pantalla: [src/presentation/pages/auth/resetPassword/index.tsx](src/presentation/pages/auth/resetPassword/index.tsx)
  - Lógica de página: [src/presentation/pages/auth/resetPassword/hook/useResetPasswordPage.ts](src/presentation/pages/auth/resetPassword/hook/useResetPasswordPage.ts)
    - Lee `code` desde la URL, decodifica JWT y valida expiración.
    - En caso de token inválido/expirado, muestra mensaje y redirige en 5s (countdown).
  - Lógica de envío: [src/presentation/pages/auth/resetPassword/hook/useResetPassword.ts](src/presentation/pages/auth/resetPassword/hook/useResetPassword.ts)
    - Valida criterios: mayúscula/minúscula, número, carácter especial y longitud mínima (14).
    - Cifra la contraseña con RSA y envía a `/reset-password`.
    - Navega a `/login` al completar correctamente.

## Manejo de Sesión y Accesos

- Gestor de sesión de autenticación: [src/presentation/utils/authSessionManager.ts](src/presentation/utils/authSessionManager.ts)
  - `invalidateSessionOnAuthAccess(...)`: si hay sesión válida y se accede a una ruta de auth, limpia el `localStorage` y resetea Redux.
  - `createNavigationProtection(...)`: protege rutas de auth frente a navegación del navegador.
  - `getCurrentUser()`: recupera la sesión almacenada.

Claves en `localStorage`:

- `Constants.LocalStorage.loggedUser`: sesión del usuario (tokens, `userInfo`, bandera `changePassword`).
- `otp_session`, `otp_timer`, `otp_start_time`, `tempOtpEmail`: sesión OTP y auxiliares (algunas limpiadas/retiradas en flujos actuales).

## Mensajes y Estados

- Se usa i18n (`useTranslation`) para textos de etiquetas, errores y estados.
- Errores visibles: login fallido, OTP inválido/expirado, problemas de reenvío, criterios de contraseña no cumplidos, código de recuperación inválido/expirado.
- Botones y accesibilidad:
  - Deshabilitar acciones mientras se verifica o no hay datos válidos.
  - Atributos `aria-*` en inputs para accesibilidad.

## Componentes Clave

- Login: inputs accesibles con validación y manejo de errores.
- Validador OTP: input de 6 dígitos con `react-verification-input`, timer visible y control de reenvío.
- Cambio de contraseña: `PasswordInput` reutilizable, visualización de criterios y errores.

## Consideraciones de Seguridad

- Cifrado RSA del password con clave pública obtenida dinámicamente y cacheada.
- Invalidación de sesión al acceder a rutas de auth estando autenticado.
- Límite de tiempo del OTP (máx. 180s) y token de sesión para acceso legítimo.
- No se persiste la sesión OTP tras expirar, pero se conserva para permitir reenvío.

## Posibles Mejores Prácticas/Extensiones

- Rotación/invalidación explícita del cache de clave pública en escenarios de cambio de clave.
- Rate-limiting de reenvíos OTP y mensajes de feedback más detallados por código de error backend.
- Persistencia del timer ante recarga de página (rehidratación desde `sessionStartTime`).
- Auditoría de intentos fallidos y bloqueo temporal.

---

Este informe enlaza los archivos clave para facilitar su revisión y evolución del flujo de autenticación.
