"use client";

import * as React from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/shadcn/dialog";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { ClinicTemplate, TemplateDeleteResult as DeleteOutcome } from "@/lib/entity/settings";
import { Count, ItemList } from "./TemplateRepublishDialogs";
import { deleteReasonText } from "./template-status";

// ── Confirmación ──────────────────────────────────────────────────────────

export interface TemplateDeleteConfirmProps {
  /** Las plantillas que se van a eliminar. Vacío = cerrado. */
  templates: ClinicTemplate[];
  onConfirm: () => void;
  onCancel: () => void;
}

/** Antes de eliminar: cuántas, y qué pasa con ellas aquí y en Meta. */
export function TemplateDeleteConfirm({ templates, onConfirm, onCancel }: TemplateDeleteConfirmProps) {
  const { t } = useI18n();
  // El contenido se conserva mientras el diálogo se cierra (la lista ya llega vacía).
  const [shown, setShown] = React.useState(templates);
  React.useEffect(() => {
    if (templates.length > 0) setShown(templates);
  }, [templates]);
  const targets = templates.length > 0 ? templates : shown;
  const count = targets.length;
  const withCount = (text: string) => text.replace("{count}", String(count));

  return (
    <AlertDialog
      open={templates.length > 0}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent className="rounded-2xl border-hairline bg-surface shadow-bento">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-ink">
            {count === 1
              ? t("settings.notifications.delete.confirm.titleOne")
              : withCount(t("settings.notifications.delete.confirm.titleMany"))}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-subtle">
              <p>
                {count === 1
                  ? t("settings.notifications.delete.confirm.introOne").replace("{name}", targets[0]?.name ?? "")
                  : withCount(t("settings.notifications.delete.confirm.introMany"))}
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>{t("settings.notifications.delete.confirm.gone")}</li>
                <li>{t("settings.notifications.delete.confirm.meta")}</li>
                <li>{t("settings.notifications.delete.confirm.notInAccount")}</li>
                <li>{t("settings.notifications.delete.confirm.inUse")}</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("settings.notifications.whatsapp.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {count === 1
              ? t("settings.notifications.delete.confirm.actionOne")
              : withCount(t("settings.notifications.delete.confirm.actionMany"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Resultado ─────────────────────────────────────────────────────────────

export interface TemplateDeleteResultProps {
  /** `null` = cerrado. Solo se abre cuando algo quedó bloqueado o falló. */
  result: DeleteOutcome | null;
  onClose: () => void;
}

/**
 * Qué pasó al eliminar cuando no salió todo: cuántas se eliminaron y, de las
 * que no, cuáles y qué hacer con cada una.
 */
export function TemplateDeleteResult({ result, onClose }: TemplateDeleteResultProps) {
  const { t } = useI18n();
  const [shown, setShown] = React.useState(result);
  React.useEffect(() => {
    if (result) setShown(result);
  }, [result]);
  const data = result ?? shown;

  return (
    <Dialog
      open={result !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-hairline bg-surface shadow-bento sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-ink">
            {t("settings.notifications.delete.result.title")}
          </DialogTitle>
          <DialogDescription className="text-subtle">
            {t("settings.notifications.delete.result.description")}
          </DialogDescription>
        </DialogHeader>
        {data && (
          <div className="space-y-4">
            <dl className="grid grid-cols-3 gap-2">
              <Count value={data.deleted} label={t("settings.notifications.delete.result.deleted")} />
              <Count value={data.blocked.length} label={t("settings.notifications.delete.result.blocked")} />
              <Count value={data.failed.length} label={t("settings.notifications.delete.result.failed")} />
            </dl>
            <ItemList
              title={t("settings.notifications.delete.result.blockedTitle")}
              items={data.blocked}
              reasonText={deleteReasonText}
            />
            <ItemList
              title={t("settings.notifications.delete.result.failedTitle")}
              items={data.failed}
              reasonText={deleteReasonText}
            />
          </div>
        )}
        <DialogFooter>
          <Button type="button" size="sm" onClick={onClose}>
            {t("settings.notifications.republish.result.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
