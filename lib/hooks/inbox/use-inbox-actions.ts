"use client";

import { useCallback, useState } from "react";
import {
  takeoverConversation,
  releaseConversation,
  resolveConversation,
  reopenConversation,
  sendInboxMessage,
  markConversationRead,
  linkConversationPatient,
  deleteConversation,
  deleteConversations,
} from "@/lib/services/inbox/inbox.service";
import { notify } from "@/lib/utils/notify";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useAssistantText } from "@/lib/contexts/assistant-name-context";

// ── Error helpers ──────────────────────────────────────────────────────────

function isConversationAlreadyAssigned(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as Error & { status?: number }).status;
  return (
    status === 409 ||
    err.message.includes("CONVERSATION_ALREADY_ASSIGNED")
  );
}

function isWindowClosed(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as Error & { status?: number }).status;
  return (
    status === 422 ||
    err.message.includes("WHATSAPP_CUSTOMER_SERVICE_WINDOW_CLOSED")
  );
}

function httpStatus(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}

// ── Individual action hooks ────────────────────────────────────────────────

export function useTakeover(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (conversationId: string) => {
      setLoading(true);
      try {
        await takeoverConversation(conversationId);
        notify.success("Conversación tomada");
        onSuccess?.();
      } catch (err: unknown) {
        if (isConversationAlreadyAssigned(err)) {
          notify.error(
            "Esta conversación ya fue asignada a otro miembro del equipo.",
          );
        } else {
          notify.error(
            err instanceof Error
              ? err.message
              : "Error al tomar la conversación",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  return { execute, loading };
}

export function useRelease(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const { withAssistant } = useAssistantText();

  const execute = useCallback(
    async (conversationId: string) => {
      setLoading(true);
      try {
        await releaseConversation(conversationId);
        notify.success(withAssistant(t("inbox.notify.releasedToAssistant")));
        onSuccess?.();
      } catch (err: unknown) {
        notify.error(
          err instanceof Error
            ? err.message
            : "Error al devolver la conversación",
        );
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, t, withAssistant],
  );

  return { execute, loading };
}

export function useResolve(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (conversationId: string) => {
      setLoading(true);
      try {
        await resolveConversation(conversationId);
        notify.success("Conversación resuelta");
        onSuccess?.();
      } catch (err: unknown) {
        notify.error(
          err instanceof Error
            ? err.message
            : "Error al resolver la conversación",
        );
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  return { execute, loading };
}

export function useReopen(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (conversationId: string) => {
      setLoading(true);
      try {
        await reopenConversation(conversationId);
        notify.success("Conversación reabierta");
        onSuccess?.();
      } catch (err: unknown) {
        notify.error(
          err instanceof Error
            ? err.message
            : "Error al reabrir la conversación",
        );
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  return { execute, loading };
}

export function useSendMessage(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (conversationId: string, text: string) => {
      setLoading(true);
      try {
        await sendInboxMessage(conversationId, text);
        onSuccess?.();
      } catch (err: unknown) {
        if (isWindowClosed(err)) {
          notify.error(
            "La ventana de servicio al cliente de WhatsApp ha expirado. El contacto debe enviar un mensaje primero.",
          );
        } else {
          notify.error(
            err instanceof Error
              ? err.message
              : "Error al enviar el mensaje",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  return { execute, loading };
}

export function useMarkRead() {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (conversationId: string) => {
    setLoading(true);
    try {
      await markConversationRead(conversationId);
    } catch {
      // Silent — marking read is best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading };
}

export function useLinkPatient(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (conversationId: string, patientId: string) => {
      setLoading(true);
      try {
        await linkConversationPatient(conversationId, patientId);
        notify.success("Paciente vinculado");
        onSuccess?.();
      } catch (err: unknown) {
        notify.error(
          err instanceof Error
            ? err.message
            : "Error al vincular paciente",
        );
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  return { execute, loading };
}

export interface UseDeleteConversationsOptions {
  /** Las conversaciones que el servidor eliminó de verdad (`deletedIds`). */
  onDeleted?: (deletedIds: string[]) => void;
  /** Ninguna de las pedidas existía ya (404): la lista está desactualizada. */
  onMissing?: (requestedIds: string[]) => void;
}

/**
 * Elimina una o varias conversaciones de la bandeja.
 *
 * El resultado se lee de `deletedIds`, no de lo que se pidió: el servidor omite
 * sin error lo que ya no existía, y decir «eliminadas» por las que no salieron
 * sería mentir. Un 403 no añade toast: el interceptor ya muestra el aviso
 * global de permiso.
 */
export function useDeleteConversations({
  onDeleted,
  onMissing,
}: UseDeleteConversationsOptions = {}) {
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const execute = useCallback(
    async (conversationIds: string[]): Promise<string[]> => {
      const ids = Array.from(new Set(conversationIds));
      if (ids.length === 0) return [];
      setLoading(true);
      try {
        const { deletedIds } =
          ids.length === 1
            ? await deleteConversation(ids[0])
            : await deleteConversations(ids);

        if (deletedIds.length < ids.length) {
          notify.warning(
            t("inbox.notify.deletedPartial")
              .replace("{deleted}", String(deletedIds.length))
              .replace("{requested}", String(ids.length)),
            { description: t("inbox.notify.deletedPartialDescription") },
          );
        } else if (deletedIds.length === 1) {
          notify.success(t("inbox.notify.deletedOne"));
        } else {
          notify.success(
            t("inbox.notify.deletedMany").replace("{count}", String(deletedIds.length)),
          );
        }
        onDeleted?.(deletedIds);
        return deletedIds;
      } catch (err: unknown) {
        const status = httpStatus(err);
        if (status === 404) {
          notify.info(
            t(ids.length === 1 ? "inbox.notify.deleteMissingOne" : "inbox.notify.deleteMissingMany"),
            { description: t("inbox.notify.deleteMissingDescription") },
          );
          onMissing?.(ids);
        } else if (status !== 403) {
          notify.error(t("inbox.notify.deleteError"), {
            description: err instanceof Error ? err.message : undefined,
          });
        }
        return [];
      } finally {
        setLoading(false);
      }
    },
    [onDeleted, onMissing, t],
  );

  return { execute, loading };
}
