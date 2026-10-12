"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/primitives/shadcn/alert-dialog";
import type { InboxConversation } from "@/lib/entity/inbox";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useAssistantText } from "@/lib/contexts/assistant-name-context";

export interface InboxDeleteDialogProps {
  /** Las conversaciones que se van a eliminar. Vacío = diálogo cerrado. */
  conversations: InboxConversation[];
  currentUserId: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación de eliminar conversaciones. Eliminar no es resolver: la
 * conversación sale de la bandeja de toda la clínica y, si el paciente vuelve a
 * escribir, empieza otra con la asistente — también cuando la eliminada la
 * estaba atendiendo una persona, y por eso ese caso se avisa aparte.
 */
export function InboxDeleteDialog({
  conversations,
  currentUserId,
  onConfirm,
  onCancel,
}: InboxDeleteDialogProps) {
  const { t } = useI18n();
  const { withAssistant } = useAssistantText();

  // El contenido se conserva mientras el diálogo se cierra (la lista ya llega vacía).
  const [shown, setShown] = React.useState(conversations);
  React.useEffect(() => {
    if (conversations.length > 0) setShown(conversations);
  }, [conversations]);
  const targets = conversations.length > 0 ? conversations : shown;

  const count = targets.length;
  const first = targets[0];
  const firstName =
    first?.patientName || first?.contactPhone || t("inbox.contact.unregistered");

  const human = targets.filter((c) => c.handlingMode === "HUMAN").length;
  const assignedOther = targets.filter(
    (c) => c.handlingMode === "HUMAN" && !!c.assignedTo && c.assignedTo !== currentUserId,
  ).length;
  const needsHuman = targets.filter((c) => c.status === "NEEDS_HUMAN").length;
  const needsAttention = human > 0 || assignedOther > 0 || needsHuman > 0;

  const withCount = (text: string, value: number) => text.replace("{count}", String(value));

  return (
    <AlertDialog
      open={conversations.length > 0}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent className="rounded-2xl border-hairline bg-surface shadow-bento">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-ink">
            {count === 1
              ? t("inbox.delete.titleOne")
              : withCount(t("inbox.delete.titleMany"), count)}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-subtle">
              <p>
                {count === 1
                  ? t("inbox.delete.descriptionOne").replace("{name}", firstName)
                  : withCount(t("inbox.delete.descriptionMany"), count)}
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>{t("inbox.delete.consequence.everyone")}</li>
                <li>{t("inbox.delete.consequence.whatsapp")}</li>
                <li>{withAssistant(t("inbox.delete.consequence.newConversation"))}</li>
              </ul>
              {needsAttention && (
                <div
                  role="alert"
                  className="flex gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-ink"
                >
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                  <div className="space-y-1">
                    <p className="font-semibold">{t("inbox.delete.attention.title")}</p>
                    <ul className="space-y-0.5">
                      {human > 0 && (
                        <li>{withCount(t("inbox.delete.attention.human"), human)}</li>
                      )}
                      {assignedOther > 0 && (
                        <li>
                          {withCount(t("inbox.delete.attention.assignedOther"), assignedOther)}
                        </li>
                      )}
                      {needsHuman > 0 && (
                        <li>{withCount(t("inbox.delete.attention.needsHuman"), needsHuman)}</li>
                      )}
                    </ul>
                    <p>{withAssistant(t("inbox.delete.attention.note"))}</p>
                  </div>
                </div>
              )}
              <p>{t("inbox.delete.resolveHint")}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("inbox.delete.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {count === 1
              ? t("inbox.delete.confirmOne")
              : withCount(t("inbox.delete.confirmMany"), count)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
