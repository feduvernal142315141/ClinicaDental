/**
 * Qué clínica es esta, resuelto desde el subdominio.
 *
 * `POST /auth/login` y `POST /auth/validate-otp` exigen `clinicSlug` para
 * encontrar al doctor por `email + clinicSlug`. El slug no lo escribe nadie:
 * sale del host con el que se entró.
 *
 *   https://prueba.clinic.dev.kodewave-solutions.com  ->  "prueba"
 *
 * Fuera de un subdominio (localhost, una IP, un preview) no hay nada que
 * deducir, así que manda `NEXT_PUBLIC_CLINIC_SLUG`. Adivinar sería peor que no
 * responder: el backend contesta "credenciales inválidas" cuando el slug no
 * coincide, y un doctor con la contraseña correcta no tendría forma de saber
 * qué está pasando.
 */

// Subdominios que son infraestructura, no una clínica.
const RESERVED_SUBDOMAINS = new Set(["www", "app", "admin", "api"]);

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

/**
 * El slug que lleva un host, o `null` si ese host no identifica una clínica.
 *
 * Pura y exportada aparte del resolutor para que se pueda razonar sobre ella
 * sin un navegador delante — este repo no tiene runner de tests.
 *
 * `appDomain` es el dominio base (`clinic.dev.kodewave-solutions.com`). Con él,
 * la extracción es exacta: el slug es lo que va delante. Sin él se cae a "la
 * primera etiqueta", que acierta en el caso normal pero no sabe distinguir el
 * dominio base de un subdominio real.
 */
export function clinicSlugFromHost(
  host: string | null | undefined,
  appDomain?: string | null,
): string | null {
  if (!host) return null;

  // Fuera el puerto: "localhost:3000" y "prueba.x.com:443".
  const hostname = host.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!hostname || hostname === "localhost" || isIpAddress(hostname)) return null;

  // `*.localhost` resuelve a 127.0.0.1 en cualquier navegador moderno, y es la
  // forma de probar subdominios sin tocar /etc/hosts. Se resuelve antes que
  // `appDomain` porque en local ese apunta al dominio de producción y dejaría
  // fuera justo el host con el que se está probando.
  if (hostname.endsWith(".localhost")) {
    const slug = hostname.split(".")[0] ?? "";
    return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null;
  }

  const base = appDomain?.trim().toLowerCase().replace(/^\.+|\.+$/g, "");

  if (base) {
    // El dominio base a secas no es una clínica; solo lo que va delante.
    if (hostname === base || !hostname.endsWith(`.${base}`)) return null;
    const prefix = hostname.slice(0, -(base.length + 1));
    const slug = prefix.split(".")[0] ?? "";
    return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null;
  }

  const labels = hostname.split(".");
  // "ejemplo.com" no lleva subdominio: no hay slug que sacar.
  if (labels.length < 3) return null;

  const slug = labels[0] ?? "";
  return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null;
}

/**
 * El slug de la clínica en la que estamos, o `null`.
 *
 * Solo cliente: lee `window.location`. Llamar en un manejador de evento (el
 * submit del login), nunca durante el render — es dato de navegador y rompería
 * la hidratación.
 */
export function resolveClinicSlug(): string | null {
  // El host manda cuando identifica una clínica: es la dirección por la que
  // entró el usuario y no puede contradecirla una variable de build. La variable
  // solo rellena el hueco — localhost a secas, o un despliegue de una sola
  // clínica sin subdominio.
  if (typeof window !== "undefined") {
    const fromHost = clinicSlugFromHost(
      window.location.hostname,
      process.env.NEXT_PUBLIC_APP_DOMAIN,
    );
    if (fromHost) return fromHost;
  }

  return process.env.NEXT_PUBLIC_CLINIC_SLUG?.trim().toLowerCase() || null;
}
