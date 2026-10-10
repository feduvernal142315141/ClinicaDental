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
