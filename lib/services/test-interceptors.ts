/**
 * ARCHIVO DE PRUEBA - Interceptores de Axios
 *
 * Este archivo contiene funciones de prueba para verificar que los interceptores
 * funcionan correctamente. Puedes llamar estas funciones desde la consola del navegador
 * o desde un componente temporal.
 *
 * NOTA: Este es un archivo de prueba. Puedes eliminarlo después de verificar
 * que todo funciona correctamente.
 */

import { serviceGet, servicePost } from "./baseService";

/**
 * Prueba 1: Verificar que el token se inyecta correctamente
 * Abre DevTools → Network y verás el header Authorization
 */
export const testTokenInjection = async () => {
  console.log("🧪 Prueba 1: Inyección de Token");
  console.log('📋 Abre DevTools → Network para ver el header "Authorization"');

  try {
    // Reemplaza con una URL válida de tu API
    const response = await serviceGet("/api/test");
    console.log("✅ Petición exitosa:", response.data);
  } catch (_error) {
    console.log("❌ Error en la petición:", _error);
  }
};

/**
 * Prueba 2: Simular error 401 (Unauthorized)
 * Esto debería mostrar un toast y redirigir a /login
 */
export const testUnauthorizedError = async () => {
  console.log("🧪 Prueba 2: Error 401 (Unauthorized)");
  console.log("👀 Deberías ver un toast y ser redirigido a /login");

  try {
    // Esta URL debe devolver un 401
    // Ajusta según tu API
    await serviceGet("/api/unauthorized-endpoint");
  } catch (_error) {
    console.log("✅ Error 401 capturado correctamente");
  }
};

/**
 * Prueba 3: Simular error 403 (Forbidden)
 * Esto debería mostrar un toast de error
 */
export const testForbiddenError = async () => {
  console.log("🧪 Prueba 3: Error 403 (Forbidden)");
  console.log("👀 Deberías ver un toast de error");

  try {
    // Esta URL debe devolver un 403
    await serviceGet("/api/forbidden-endpoint");
  } catch (_error) {
    console.log("✅ Error 403 capturado correctamente");
  }
};

/**
 * Prueba 4: Simular error 500 (Internal Server Error)
 * Esto debería mostrar un toast de error
 */
export const testServerError = async () => {
  console.log("🧪 Prueba 4: Error 500 (Internal Server Error)");
  console.log("👀 Deberías ver un toast de error");

  try {
    // Esta URL debe devolver un 500
    await serviceGet("/api/server-error-endpoint");
  } catch (_error) {
    console.log("✅ Error 500 capturado correctamente");
  }
};

/**
 * Prueba 5: Simular error 400 (Bad Request)
 * Esto debería mostrar un toast de error
 */
export const testBadRequest = async () => {
  console.log("🧪 Prueba 5: Error 400 (Bad Request)");
  console.log("👀 Deberías ver un toast de error");

  try {
    // Enviar datos inválidos
    await servicePost("/api/create-something", { invalid: "data" });
  } catch (_error) {
    console.log("✅ Error 400 capturado correctamente");
  }
};

/**
 * Prueba 6: Simular error de red (sin conexión)
 * Esto debería mostrar un toast indicando problemas de conexión
 */
export const testNetworkError = async () => {
  console.log("🧪 Prueba 6: Error de Red");
  console.log("👀 Deberías ver un toast sobre problemas de conexión");
  console.log("💡 Desconecta tu internet y ejecuta esta función");

  try {
    await serviceGet("/api/any-endpoint");
  } catch (error) {
    console.log("✅ Error de red capturado correctamente");
  }
};

/**
 * Ejecutar todas las pruebas (excepto las que requieren desconexión)
 */
export const runAllTests = async () => {
  console.log("🚀 Ejecutando todas las pruebas...");
  console.log(
    "⚠️ Nota: Estas pruebas fallarán si no tienes endpoints configurados",
  );
  console.log("📝 Ajusta las URLs según tu API");
  console.log("─".repeat(50));

  await testTokenInjection();
  console.log("─".repeat(50));

  // Comentadas por defecto para no redirigir automáticamente
  // Descomenta si quieres probarlas
  // await testUnauthorizedError()
  // await testForbiddenError()
  // await testServerError()
  // await testBadRequest()
};

/**
 * CÓMO USAR ESTAS PRUEBAS:
 *
 * 1. Desde la consola del navegador:
 *    import * as tests from '@/lib/services/test-interceptors'
 *    tests.testTokenInjection()
 *
 * 2. Desde un componente temporal:
 *    import { testTokenInjection } from '@/lib/services/test-interceptors'
 *
 *    export default function TestPage() {
 *      return (
 *        <div>
 *          <button onClick={testTokenInjection}>Test Token</button>
 *        </div>
 *      )
 *    }
 *
 * 3. Verificar en DevTools:
 *    - Network tab: Ver headers y respuestas
 *    - Console: Ver logs de los interceptores
 */

// Exportar todo para uso en consola
export default {
  testTokenInjection,
  testUnauthorizedError,
  testForbiddenError,
  testServerError,
  testBadRequest,
  testNetworkError,
  runAllTests,
};
