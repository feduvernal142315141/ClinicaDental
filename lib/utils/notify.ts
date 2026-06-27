import { toast, type ExternalToast } from "sonner";

/**
 * Wrapper único de notificaciones sobre `sonner`.
 *
 * Reemplaza el `message.*` de Ant Design con una API imperativa equivalente
 * (no requiere provider/contextHolder). Mantiene firmas compatibles para que
 * la migración desde `message.success(text)` sea mecánica:
 *
 *   message.success("Guardado")  →  notify.success("Guardado")
 *
 * Para UI optimista en mutaciones usar `notify.promise`.
 */
export const notify = {
  success: (message: string, opts?: ExternalToast) => toast.success(message, opts),
  error: (message: string, opts?: ExternalToast) => toast.error(message, opts),
  warning: (message: string, opts?: ExternalToast) => toast.warning(message, opts),
  info: (message: string, opts?: ExternalToast) => toast.info(message, opts),
  message: (message: string, opts?: ExternalToast) => toast(message, opts),
  loading: (message: string, opts?: ExternalToast) => toast.loading(message, opts),
  dismiss: (id?: string | number) => toast.dismiss(id),
  promise: toast.promise,
};

export type Notify = typeof notify;
