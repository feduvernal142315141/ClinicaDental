import { sileo, type SileoOptions, type SileoButton } from "sileo";

/**
 * Facade ÚNICO de notificaciones del proyecto (estándar 2026).
 *
 * Implementado sobre **Sileo** (toasts con físicas/spring). Importa SIEMPRE este
 * facade (`@/lib/utils/notify`) en vez de `sileo` directamente: es el único
 * punto para theming, duraciones y la API.
 *
 * Estándar de copy: los mensajes son EXPLICATIVOS. Un `title` corto en
 * mayúscula inicial + una `description` que diga al usuario QUÉ pasó y, cuando
 * aplique, QUÉ hacer a continuación. Siempre en español.
 *
 *   notify.success("Paciente creado", {
 *     description:
 *       "El paciente ya aparece en el listado y puedes agendarle citas.",
 *   });
 *
 *   notify.error("No se pudo guardar la cita", {
 *     description:
 *       "Revisa tu conexión e inténtalo de nuevo. Si persiste, contacta a soporte.",
 *   });
 */
export type NotifyOptions = Omit<SileoOptions, "title" | "type">;

const DURATION = 5500;
const ERROR_DURATION = 9000; // los errores necesitan más tiempo de lectura

export const notify = {
  success: (title: string, opts?: NotifyOptions) =>
    sileo.success({ title, duration: DURATION, ...opts }),
  error: (title: string, opts?: NotifyOptions) =>
    sileo.error({ title, duration: ERROR_DURATION, ...opts }),
  warning: (title: string, opts?: NotifyOptions) =>
    sileo.warning({ title, duration: DURATION, ...opts }),
  info: (title: string, opts?: NotifyOptions) =>
    sileo.info({ title, duration: DURATION, ...opts }),
  message: (title: string, opts?: NotifyOptions) =>
    sileo.show({ title, duration: DURATION, ...opts }),
  loading: (title: string, opts?: NotifyOptions) =>
    sileo.show({ title, type: "loading", duration: null, ...opts }),
  /** Toast con botón de acción (p. ej. "Deshacer", "Reintentar"). */
  action: (title: string, button: SileoButton, opts?: NotifyOptions) =>
    sileo.action({ title, button, duration: DURATION, ...opts }),
  /** Cierra un toast por id, o todos si se omite. */
  dismiss: (id?: string | number) =>
    id !== undefined ? sileo.dismiss(String(id)) : sileo.clear(),
  /** Toast ligado a una promesa (loading → success / error). */
  promise: sileo.promise,
};

export type Notify = typeof notify;
